"use strict";

class DraftSimPackage {
  constructor(
    set,
    setSize,
    inputSize,
    oddsOfRare,
    specialSlot = ["Mountain", "Swamp", "Forest", "Plains", "Island"],
    elements,
    mlPreds,
    genericPack
  ) {
    this.set = set; //String of the set name
    this.setSize = setSize; //Number of cards in the set
    this.inputSize = inputSize; //Size of the input array into the neural net
    this.oddsOfRare = oddsOfRare; //Odds of opening a rare in any given pack, relateive to a mythic (0-1)
    this.specialSlot = specialSlot; //Array of strings that represent the unique set of cards that can be in the land slot for a se
    this.elements = elements;
    this.MLPreds = mlPreds;
    this.genericPack = genericPack
  }
  // Critical variables
  masterHash; // Layered object that can take any card representation and turn into any other card representation
  model; //Tensorflow JS model file
  ratings;

  // Variables used to maintain the global gamestate. All start with the word "current"
  currentScore = 0;
  currentPick = 0;
  currentPack = 0;
  currentPicksActive = false;
  currentFeedbackActive = true;
  currentPoolToggled = false;
  currentDraftOver = false;
  currentMainDeckCount = 0;
  currentScoreFixed = 0;

  // Variables that store gamestate information of players, like decks and onehots.  All start with the word "active"
  activePacks; // Onehot array of shape [8, 3, 280] representing all packs in the draft
  activeOnehots; // Array of shape [8, 574] representing the vector being fed into the prediction matrix
  activePreds = []; // Array of length 8 representing the bot pred of each pick being made
  activePicks; // Array of length 8 representing each being made.  For human, it is their choice
  activeFeatureVectors; // Array of shape [8, 14] representing all players feature vectors
  activePools; //Array of shape [8, 280] representing all pools for all players
  activePickSoftmax; // the softmax output of the human pick
  activePoolUrls = [[], [], [], [], [], [], []]; //Initalizing empty array that we append pool urls to later
  activePoolSideboard = [[], [], [], [], [], [], []]; //Even though sideboard is one pile, we keep urls in piles to easily convert back to pool later

  // initalizing variables to save the commons, uncommons, rares and mythics in the set, used to make packs
  commons = [];
  uncommons = [];
  rares = [];
  mythics = [];

  // this is the way we code feature fectors for the ML model.  A white 2 drop would be [0,1,0,0,0,0,0,0,1,0,0,0,0,0,0] (W and 2.0)
  feature_vector_index = {
    Colorless: 0,
    W: 1,
    U: 2,
    B: 3,
    R: 4,
    G: 5,
    0.0: 6,
    1.0: 7,
    2.0: 8,
    3.0: 9,
    4.0: 10,
    5.0: 11,
    6.0: 12,
    7.0: 13,
  };

  ///////////////////////////////// HELPER FUNCTIONS //////////////////////////////////

  // For each 1's in a onehot, it returns the name of those cards
  findContense(onehot) {
    let outputArray = [];
    for (let i = 0; i < onehot.length; i++) {
      if (onehot[i] > 0) {
        outputArray.push(this.masterHash["index_to_name"][i]);
      }
    }
    return outputArray;
  }

  // Sums all the 1's in a onehot and returns the sum
  findSum(onehot) {
    let count = 0;
    for (let i = 0; i < onehot.length; i++) {
      count += onehot[i];
    }
    return count;
  }

  ////////////////////////////// GENERATING ACTIVE VARIABLES ///////////////////////////////
  // To generate packs, we need to first sort the cards by rarity.  This function does this, using data provided by masterHash
  generateRarityArrays = () => {
    let cardsAvailable = [];
    for (let key in this.masterHash["name_to_collector"]) {
      if (this.masterHash["name_to_collector"][key] < 286) {
        cardsAvailable.push(key);
      }
    }
    for (let m = 0; m < cardsAvailable.length; m++) {
      if (
        this.masterHash["name_to_rarity"][cardsAvailable[m]] === "common" &&
        !this.specialSlot.includes(cardsAvailable[m])
      ) {
        this.commons.push(cardsAvailable[m]);
      }
      if (this.masterHash["name_to_rarity"][cardsAvailable[m]] === "uncommon") {
        this.uncommons.push(cardsAvailable[m]);
      }
      if (this.masterHash["name_to_rarity"][cardsAvailable[m]] === "rare") {
        this.rares.push(cardsAvailable[m]);
      }
      if (this.masterHash["name_to_rarity"][cardsAvailable[m]] === "mythic") {
        this.mythics.push(cardsAvailable[m]);
      }
    }
    return [
      this.commons,
      this.uncommons,
      this.rares,
      this.mythics,
      this.specialSlot,
    ];
  };

  // this function sets up 8 empty onehot vector pool arrays that will be populated as the players move through the draft
  generateActivePools = () => {
    let activePoolsTemp = [];
    let pool;
    for (let i = 0; i < 8; i++) {
      (pool = []).length = this.setSize;
      pool.fill(0);
      activePoolsTemp.push(pool);
    }
    return activePoolsTemp;
  };
  //this function sets up 8 empty feature vector pool arrays that will be populated as the players move through the draft
  generateActiveFeatures = () => {
    this.activeFeatureVectors = [];
    let features;
    for (let i = 0; i < 8; i++) {
      (features = []).length = 14;
      features.fill(0);
      this.activeFeatureVectors.push(features);
    }
    return this.activeFeatureVectors;
  };
  // Function to generate a random pack of Kaldheim cards
  generatePack = () => {
    if (this.genericPack === true) {  //this is used to allow custom pack generation functions defined in mainset.js
      let activePackTemp;
      (activePackTemp = []).length = this.setSize;
      activePackTemp.fill(0);
      let pack = [];
      const cards = [this.commons, this.uncommons, this.specialSlot];
      const quantity = [10, 3, 1];

      // add commons, uncommons, snow lands
      for (let i = 0; i < 3; i++) {
        let shuffled = cards[i].sort(() => 0.5 - Math.random());
        // Get sub-array of first n elements after shuffled
        let selected = shuffled.slice(0, quantity[i]);
        for (let j = 0; j < quantity[i]; j++) {
          pack.push(selected[j]);
        }
      }
      // add rare/mythic
      let randomNum = Math.random();
      if (randomNum > this.oddsOfRare) {
        let shuffled = this.mythics.sort(() => 0.5 - Math.random());
        let selected = shuffled.slice(0, 1);
        pack.push(selected);
      } else {
        let shuffled = this.rares.sort(() => 0.5 - Math.random());
        let selected = shuffled.slice(0, 1);
        pack.push(selected);
      }

      for (let card = 0; card < 15; card++) {
        activePackTemp[this.masterHash["name_to_index"][pack[card]]] = 1;
      }
      return activePackTemp;
    } else if (this.genericPack === false) {
      let activePackTemp = generatePackSpecial();  //call the custom pack generation function.  must be names generatePackSpecial()
      return activePackTemp;
    }
  };

  // This function is called once at the beginning of each draft, and generates the 24 packs passed between bots
  generateActivePacks = () => {
    let activePacksTemp = [];
    for (let l = 0; l < 8; l++) {
      let temp = [];
      for (let k = 0; k < 3; k++) {
        let pack = this.generatePack();
        temp.push(pack);
      }
      activePacksTemp.push(temp);
    }
    return activePacksTemp;
  };

  ///////////////////////////////// MAKING PREDICTIONS //////////////////////////////////

  //This is the ML model hosted by TFJS.  This function takes a onehot of shape this.inputShape and spits out a onehot vector
  // We need to manutally take the argmax of the softmax and use masterHash["index_to_name"] to find the card name of that output
  makeMLPreds = (arrayOfOnehots) => {
    // generating packs to multiply predictions by
    let arrayOfPacks = [];
    for (let k = 0; k < arrayOfOnehots.length; k++) {
      arrayOfPacks.push(
        arrayOfOnehots[k].slice(this.setSize, this.setSize * 2)
      );
    }
    //generating preds
    let predRaw = this.model.predict(
      tf.reshape(arrayOfOnehots, [8, this.inputSize])
    );
    const v = predRaw.dataSync();

    //Saving the softmax activations for the human pick
    this.activePickSoftmax = [];
    for (let q = 0; q < this.setSize; q++) {
      this.activePickSoftmax.push(v[q] * arrayOfPacks[0][q]);
    }
    //Saving the argmax preds for each player
    let arrayOfIndexes = [];
    for (let k = 0; k < 8; k++) {
      let max_value = 0;
      let max_value_index = 275;
      let arrayOfPred = v.slice(k * this.setSize, (k + 1) * this.setSize);
      let packLimitedPred = [];
      for (let z = 0; z < arrayOfPred.length; z++) {
        packLimitedPred.push(arrayOfPred[z] * arrayOfPacks[k][z]);
      }
      max_value = 0;
      for (let i = 0; i < packLimitedPred.length; i++) {
        if (packLimitedPred[i] > max_value) {
          max_value = packLimitedPred[i];
          max_value_index = i;
        }
      }
      arrayOfIndexes.push(max_value_index);
    }
    this.activePreds = arrayOfIndexes;
  };

  // Bot algorithm that uses heuristics to make predictions rather than machine learning.  For when we have insufficient ML data
  makeHeuristicPreds() {
    for (let i = 0; i < 8; i++) {
      if (i === 0) {
        this.activePickSoftmax = Array(this.setSize).fill(0);
      }
      let colorcomitted = false;
      let colorComitOne;
      let colorComitTwo;
      let colorValueSum;
      let colorPull = {
        W: 0,
        U: 0,
        B: 0,
        R: 0,
        G: 0,
      };
      let pack = this.findContense(this.activePacks[i][this.currentPack]);
      let pool = this.findContense(this.activePools[i]);

      // Calcuating the pull for each players colors to apply bonus to card value
      for (let k = 0; k < pool.length; k++) {
        let color = this.masterHash["name_to_color"][pool[k]];
        let rating = parseInt(this.ratings[pool[k]]);
        if (rating === NaN || this.ratings[pool[k]] === "") {
          console.log(rating, this.ratings[pool[k]]);
          console.log("card", pool[k])
        }
        for (let l = 0; l < color.length; l++) {
          let pull = (rating - 2) * 0.266;
          if (pull < 0) {
            pull = 0;
          }
          colorPull[color[l]] += pull;
          if (rating === NaN) {
          } 
        }
      }

      // Determining if we are in the "two color locked" threshold
      let colorPullArray = Object.entries(colorPull);
      colorPullArray.sort(function (a, b) {
        return b[1] - a[1];
      });
      if (colorPullArray[0][1] > 3.3 && colorPullArray[1][1] > 3.3) {
        colorcomitted = true;
        colorComitOne = colorPullArray[0][0];
        colorComitTwo = colorPullArray[1][0];
      }

      // calculating pack values
      //////////////////////////////// i need to cap the colorrating bonus /
      let packCardValues = [];
      for (let m = 0; m < pack.length; m++) {
        let cardRating = parseInt(this.ratings[pack[m]]);
        let color = this.masterHash["name_to_color"][pack[m]];
        if (colorcomitted === false) {
          if (color.length === 0) {
            cardRating += colorPullArray[0][1];
          } else if (color.length === 1) {
            cardRating += colorPull[color[0]];
          } else if (color.length === 2) {
            let colorMatchValue = colorPull[color[0]] + colorPull[color[1]];
            cardRating += colorMatchValue;
          } else if (color.length > 2) {
            cardRating -= 0.55;
          }
        } else {
          if (color.length === 0) {
            cardRating += 2.55;
          }
          if (color.length === 1) {
            if (color[0] === colorComitOne || color[0] === colorComitTwo) {
              cardRating += 2.55;
            }
          }
          if (color.length === 2) {
            cardRating = 1; //Change once we have rating dict
            if (color[0] === colorComitOne || color[0] === colorComitTwo) {
              cardRating += 1.25; //Change once we have rating dict
            }
            if (color[1] === colorComitOne || color[1] === colorComitTwo) {
              cardRating += 1.25; //Change once we have rating dict
            }
          }
          if (color.length > 2) {
            cardRating = 1;
            if (color[0] === colorComitOne || color[0] === colorComitTwo) {
              cardRating += 0.75;
            }
            if (color[1] === colorComitOne || color[1] === colorComitTwo) {
              cardRating += 0.75;
            }
            if (color[2] === colorComitOne || color[2] === colorComitTwo) {
              cardRating += 0.75;
            }
          }
        }
        if (i === 0) {
          this.activePickSoftmax[
            this.masterHash["name_to_index"][pack[m]]
          ] = cardRating + 0.0001
        }
        let nameAndRating = [pack[m], cardRating];
        packCardValues.push(nameAndRating);
      }
      packCardValues.sort(function (a, b) {
        return b[1] - a[1];
      });
      let pick = packCardValues[0][0];
      let pickIndex = this.masterHash["name_to_index"][pick];
      this.activePreds[i] = pickIndex;
    }
  }

  makePred() {
    if (this.MLPreds === true) {
      this.makeMLPreds();
    } else {
      this.makeHeuristicPreds();
    }
  }

  ///////////////////////////////// DISPLAY //////////////////////////////////
  // Change the displayed pack SRCs to the image of the current pack
  displayPack = (playerOnehot) => {
    let humanPlayerActivePack = playerOnehot.slice(
      this.setSize,
      this.setSize * 2
    );
    let arrayOfURLs = [];
    for (let z = 0; z < 15; z++) {
      this.elements["DisplayedPack"][z].classList.add("fullPack");
      this.elements["DisplayedPack"][z].src = "";
    }
    for (let i = 0; i < humanPlayerActivePack.length; i++) {
      if (humanPlayerActivePack[i] > 0) {
        arrayOfURLs.push(this.masterHash["index_to_url"][i]);
      }
    }
    //Sort URLS by rarity
    let arrayOfSortedURLS = [];
    let rares = [];
    let uncommons = [];
    let commons = [];
    for (let m = 0; m < arrayOfURLs.length; m++) {
      let cardName = this.masterHash["url_to_name"][arrayOfURLs[m]];
      let rarity = this.masterHash["name_to_rarity"][cardName];
      if (rarity === "common") {
        commons.push(arrayOfURLs[m]);
      } else if (rarity === "uncommon") {
        uncommons.push(arrayOfURLs[m]);
      } else {
        rares.push(arrayOfURLs[m]);
      }
    }
    arrayOfSortedURLS = arrayOfSortedURLS.concat(rares, uncommons, commons);
    for (let k = 0; k < arrayOfSortedURLS.length; k++) {
      this.elements["DisplayedPack"][k].src = arrayOfSortedURLS[k];
    }
  };
  /*
  We use the formula (y = -(error*error)^e + 1), where e is the natural log 2.8, and error is (humansoftmax / botsoftmax)  
  to generate a number between zero and one that represents the "correctness" of the human pick.  If the human and bot pick 
  the same card, the error is 0, and y=1.  If the bot hates the human pick, error is close to 1, so y is close to zero.  The error is 
  never greater than one since the bot always picks the highest softmax in each pack.  This function makes that calculation and 
  then updates the score.innerHTML to reflect the result
  */
  displayPickAccuracy = (activePickSoftmax, picks, preds) => {
    this.elements["ScoreHTML"].style.opacity = 0;
    setTimeout(() => {
      this.elements["FeedbackHTML"].style.opacity = 1;
      let botPickSoftmax = activePickSoftmax[preds[0]];
      let humanPickSoftmax = activePickSoftmax[picks[0]];
      let error = 1 - humanPickSoftmax / botPickSoftmax;
      let pickValue
      if (this.makeMLPreds === true) {
        pickValue = -Math.pow(error, 2.8) + 1;
      } else {
        pickValue = -error + 1;
      }
      this.currentScore += pickValue;
      console.log(pickValue, "pickvalue");
      this.currentScoreFixed = this.currentScore.toFixed(1);
      this.elements["FeedbackHTML"].style.color = "white";
      if (this.currentScoreFixed[this.currentScoreFixed.length - 1] === "0") {
        this.currentScoreFixed = this.currentScore.toFixed(0);
      }
      this.elements["ScoreHTML"].innerHTML = `${this.currentScoreFixed} / ${
        this.currentPick + 1
      }`;
      if (pickValue >= 0.95) {
        this.elements["FeedbackHTML"].innerHTML = "Excellent!";
      }
      if (pickValue >= 0.7 && pickValue < 0.95) {
        this.elements["FeedbackHTML"].innerHTML = "Great!";
      }
      if (pickValue >= 0.5 && pickValue < 0.7) {
        this.elements["FeedbackHTML"].innerHTML = "Not bad!";
      }
      if (pickValue >= 0.3 && pickValue < 0.5) {
        this.elements["FeedbackHTML"].innerHTML = "Possible Mistake";
      }
      if (pickValue < 0.3) {
        this.elements["FeedbackHTML"].innerHTML = "Mistake";
      }
      this.elements["ScoreHTML"].style.opacity = 1;
    }, 150);
    return;
  };

  // Highlight the pick the bot likes
  displayBotPred = (pred) => {
    if (this.currentFeedbackActive === true) {
      let predURL = this.masterHash["index_to_url"][pred];
      for (let i = 0; i < this.elements["DisplayedPack"].length; i++) {
        if (this.elements["DisplayedPack"][i].src === predURL) {
          //using ID instead of classname here because it's easier + faster to remove between card draws:
          this.elements["DisplayedPack"][i].id = "greenSelect";
        }
      }
    }
    return;
  };

  //Function that sorts a column of the pool by color
  displayPoolSortedByColor(elementPoolArray) {
    let sortedSRCS = [];
    let tuples = [];
    for (let i = 0; i < elementPoolArray.length; i++) {
      if (elementPoolArray[i].length > 100) {
        //75 represents a length between an empty SRC (basic path) and 117, scryfall path length
        // let temp = [poolArrayCol[i], this.masterHash["name_to_color"][this.masterHash["src_to_name"][poolArrayCol[i]]]];
        let cardURL = elementPoolArray[i];
        let cardName = this.masterHash["url_to_name"][cardURL];
        let cardColor = this.masterHash["name_to_color"][cardName];
        if (cardColor.length === 0) {
          cardColor = "AColorless";
        } else if (cardColor.length > 1) {
          cardColor = "ZMulticolor";
        } else {
          cardColor = cardColor[0];
        }
        let cardTuple = [cardURL, cardColor];
        tuples.push(cardTuple);
      }
    }
    tuples = tuples.sort((a, b) =>
      a[1].toUpperCase().localeCompare(b[1].toUpperCase())
    );
    for (let j = 0; j < tuples.length; j++) {
      sortedSRCS.push(tuples[j][0]);
    }
    return sortedSRCS;
  }
  // Function that updates the src's of the sideboard column elements generated by our HTML function to show sideboarded card images.
  displaySideboard() {
    let arrayOfSideboardImages = [];
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < this.activePoolSideboard[j].length; i++) {
        arrayOfSideboardImages.push(this.activePoolSideboard[j][i]);
      }
    }
    for (let k = 0; k < 30; k++) {
      this.elements["SideboardArray"][k].src = "";
      if (arrayOfSideboardImages[k]) {
        this.elements["SideboardArray"][k].src = arrayOfSideboardImages[k];
      }
    }
  }
  //  Function that resets the card srcs of sideboard cards if the player presses the "resetSideboard button"
  displayResetSideboard() {
    for (let k = 0; k < this.elements["SideboardArray"].length; k++) {
      this.elements["SideboardArray"][k].src = "";
    }
  }

  displayRemoveBorders() {
    if (document.getElementById("orangeSelect")) {
      document.getElementById("orangeSelect").removeAttribute("id");
    }

    if (document.getElementById("greenSelect")) {
      document.getElementById("greenSelect").removeAttribute("id");
    }
  }

  updateActivePools(picks) {
    let humanPick = this.masterHash["index_to_name"][picks[0]];
    let humanPickCMC = this.masterHash["name_to_cmc"][humanPick];
    let humanPickURL = this.masterHash["name_to_url"][humanPick][
      this.masterHash["name_to_url"][humanPick].length - 1
    ];
    if (humanPickCMC < 7) {
      this.activePoolUrls[humanPickCMC].push(humanPickURL);
    } else {
      this.activePoolUrls[5].push(humanPickURL);
    }
  }

  // Function that displays the images of the cards you have selected in the pool tab
  displayPoolImages = () => {
    for (let j = 0; j < 7; j++) {
      this.activePoolUrls[j] = this.displayPoolSortedByColor(
        this.activePoolUrls[j]
      );
      for (let i = 0; i < this.activePoolUrls[j].length; i++) {
        this.elements["PoolArray"][j][i].src = this.activePoolUrls[j][i];
      }
    }
  };
  //  Function that resets pool after you remove a card from it and hide it in the sideboard
  displayPoolAfterSideboard = (event) => {
    const clicked = event.srcElement.id;
    const pile = clicked[0];
    const index = parseInt(clicked.slice(2, 4)); //note that index is one above the index used in array
    const cutURL = this.activePoolUrls[pile].splice(index - 1, 1);
    this.activePoolSideboard[pile].push(cutURL[0]);
    for (let k = 0; k < 30; k++) {
      this.elements["PoolArray"][pile][k].src = "";
    }
    for (let z = 0; z < this.activePoolUrls[pile].length; z++) {
      this.elements["PoolArray"][pile][z].src = this.activePoolUrls[pile][z];
    }
    this.displaySideboard();
    this.currentMainDeckCount -= 1;
    this.displayMainDeckCount();
    this.updatePoolTooltips();
    return;
  };

  // Function that resets pool images after you click the button and returns sideboard cards to maindeck
  displayPoolAfterReset = () => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < this.activePoolSideboard[i].length; j++) {
        this.activePoolUrls[i].push(this.activePoolSideboard[i][j]);
      }
    }
    for (let k = 0; k < 7; k++) {
      for (let l = 0; l < this.activePoolUrls[k].length; l++) {
        this.elements["PoolArray"][k][l].src = this.activePoolUrls[k][l];
      }
    }
    this.activePoolSideboard = [[], [], [], [], [], [], []];
    this.displayResetSideboard();
    this.updatePoolTooltips();
  };

  // Function that hides or displays player feedback based on user input in the menu
  displayFeedbackToggle = () => {
    if (this.currentFeedbackActive === true) {
      this.elements["FeedbackHTML"].style.visibility = "hidden";
      this.elements["ScoreHTML"].style.visibility = "hidden";
      this.currentFeedbackActive = false;
      return;
    }
    if (this.currentFeedbackActive === false) {
      this.elements["FeedbackHTML"].style.visibility = "visible";
      this.elements["ScoreHTML"].style.visibility = "visible";
      this.currentFeedbackActive = true;
      return;
    }
  };
  // Function that is called when a player clicks on a sideboard card to move it back into the pool
  moveSideboardToPool = (event) => {
    let sideboardSrc = event.srcElement.src;
    let cmc = this.masterHash["name_to_cmc"][
      this.masterHash["url_to_name"][sideboardSrc]
    ];
    if (cmc > 6) {
      cmc = 6;
    }
    let PSindex = this.activePoolSideboard[cmc].findIndex(
      (e) => e === sideboardSrc
    );
    this.activePoolSideboard[cmc].splice(PSindex, 1);
    this.displaySideboard();
    this.activePoolUrls[cmc].push(sideboardSrc);
    for (let j = 0; j < 7; j++) {
      this.activePoolUrls[j] = this.displayPoolSortedByColor(
        this.activePoolUrls[j]
      );
      for (let i = 0; i < this.activePoolUrls[j].length; i++) {
        this.elements["PoolArray"][j][i].src = this.activePoolUrls[j][i];
      }
    }
    this.currentMainDeckCount++;
    this.displayMainDeckCount();
    this.updatePoolTooltips();
  };

  displayMainDeckCount() {
    this.elements["ScoreHTML"].style.opacity = 0;
    setTimeout(() => {
      this.elements[
        "ScoreHTML"
      ].innerHTML = `Maindeck: ${this.currentMainDeckCount}`;
      this.elements["ScoreHTML"].style.opacity = 1;
    }, 150);
  }

  displayScore() {
    this.elements["ScoreHTML"].style.opacity = 0;
    setTimeout(() => {
      this.elements["ScoreHTML"].innerHTML = `${this.currentScoreFixed} / ${
        this.currentPick + 1
      }`;
      this.elements["ScoreHTML"].style.opacity = 1;
    }, 150);
  }

  ///////////////////////////////// UPDATE LOGIC //////////////////////////////////
  // Function that updates feature vectors
  updateFeatureVectors = (
    picks,
    featureVectors = this.activeFeatureVectors
  ) => {
    for (let i = 0; i < 8; i++) {
      let predName = this.masterHash["index_to_name"][picks[i]];
      let predColor = this.masterHash["name_to_color"][predName];
      let predCMC = this.masterHash["name_to_cmc"][predName];
      if (predColor.length === 0) {
        featureVectors[i][this.feature_vector_index["Colorless"]] += 1;
      } else {
        for (let m = 0; m < predColor.length; m++) {
          featureVectors[i][this.feature_vector_index[predColor[m]]] +=
            1 / predColor.length;
        }
      }
      if (predCMC > 7) {
        featureVectors[i][this.feature_vector_index[7.0]] += 1;
      } else {
        featureVectors[i][this.feature_vector_index[predCMC]] += 1;
      }
    }
    return featureVectors;
  };

  // Function that adds the prediction to the pool onehot of all 7 bots and human player
  updatePools = (picks, arrayOfPools) => {
    for (let i = 0; i < 8; i++) {
      arrayOfPools[i][picks[i]] += 1;
    }
  };

  // Function that updates the nested arrays that represent the cards in each pack after each player makes a pick
  updatePacks = (
    count = this.currentPick,
    draftPack = this.activePacks,
    picks = this.activePicks
  ) => {
    let pack = Math.floor(this.currentPick / 15);
    let arrayOfActivePacks = [];
    if (count !== 15 && count !== 30 && count !== 0) {
      for (let i = 0; i < 8; i++) {
        draftPack[i][pack][picks[i]] = 0;
        arrayOfActivePacks.push(draftPack[i][pack]);
      }
      if (this.currentPack !== 1) {
        let last = arrayOfActivePacks.pop();
        arrayOfActivePacks.unshift(last);
        for (let j = 0; j < 8; j++) {
          this.activePacks[j][pack] = arrayOfActivePacks[j];
        }
      } else {
        let first = arrayOfActivePacks.shift();
        arrayOfActivePacks.push(first);
        for (let j = 0; j < 8; j++) {
          this.activePacks[j][pack] = arrayOfActivePacks[j];
        }
      }
    }
    return this.activePacks;
  };

  // Function that takes players features, pools and pack and generates concatenated array
  updateOnehots = (packs, features, pools, packnum) => {
    let activeOnehotsTemp = [];
    for (let i = 0; i < 8; i++) {
      let playersOnehot = [];
      let playerOnehotTemp = playersOnehot.concat(
        pools[i],
        packs[i][packnum],
        features[i]
      );
      activeOnehotsTemp.push(playerOnehotTemp);
    }
    return activeOnehotsTemp;
  };

  // Updates the global gamestate variables to signify a new turn
  updatePick = () => {
    this.currentPick++;
    this.currentPack = Math.floor(this.currentPick / 15);
  };
  // Function that updates what is displayed when the pool window button is toggled
  updatePoolToggled = () => {
    if (this.currentPoolToggled === false) {
      this.displayPoolImages();
      this.updatePoolTooltips();
      this.displayMainDeckCount();
      this.currentPoolToggled = true;
      this.elements["PoolToggle"].style.color = "black";
      this.elements["PoolToggle"].style.backgroundColor = "white";
      this.elements["RestartIcon"].style.display = "none";
    } else {
      this.elements["ScoreHTML"].innerHTML = "";
      this.currentPoolToggled = false;
      this.elements["PoolToggle"].style.color = "white";
      this.elements["PoolToggle"].style.backgroundColor = "black";
      if (this.currentDraftOver === true) {
        this.elements["RestartIcon"].style.display = "block";
      }
    }
  };

  // Function that prepares logic for player resetting draft on click
  updateDraftIfOver = () => {
    if (this.currentPick === 45) {
      for (let i = 0; i < this.displayPack.length; i++) {
        this.elements["DisplayedPack"][i].style.display = "none";
        this.elements["DisplayedPack"][i].style.border = "transparent";
      }
      this.elements["RestartIcon"].style.display = "block";
      this.elements["RestartIcon"].addEventListener("click", resetDraft);
    }
    this.currentDraftOver = true;
  };

  updatePoolTooltips() {
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < this.activePoolUrls[j].length; i++) {
        let src = this.elements["PoolArray"][j][i].src;
        this.elements["PoolArray"][j][i].removeAttribute("title");
        this.elements["PoolArray"][j][i].removeAttribute("data-toggle");
        this.elements["PoolArray"][j][i].setAttribute("data-toggle", "tooltip");
        this.elements["PoolArray"][j][i].setAttribute(
          "title",
          `<img src="${src}" class="tooltip-popup" />`
        );
        $('[data-toggle="tooltip"]').tooltip("dispose");
        $(document).ready(function () {
          $("[data-toggle=tooltip]").tooltip({
            animated: "fade",
            placement: "right",
            html: true,
          });
        });
      }
    }
  }
  ////////////////////////////////// END DRAFT ////////////////////////////////////

  // Function that resets the gamestate from the beginning
  resetDraft = () => {
    // resetting all varaiables that store gamestate
    for (let i = 0; i < 15; i++) {
      this.elements["DisplayedPackDiv"][i].style.animation =
        "fadeOut ease 0.25s";
    }
    this.currentScore = 0;
    this.currentScoreFixed = 0;
    this.currentPick = 0;
    this.currentPack = 0;
    this.currentPicksActive = false;
    this.currentFeedbackActive = true;
    this.activePacks = [];
    this.activeOnehots = [];
    this.activePreds = [];
    this.activePicks = [];
    this.activeFeatureVectors = this.generateActiveFeatures();
    this.activePools = this.generateActivePools();
    this.activePickSoftmax = [];
    this.activePoolUrls = [[], [], [], [], [], [], []];
    this.activePoolSideboard = [[], [], [], [], [], [], []];
    this.elements["RestartIcon"].style.display = "none";
    this.currentDraftOver = false;
    this.currentMainDeckCount = 0;

    // generating new packs and startingone onehots and preds
    this.activePacks = this.generateActivePacks();
    this.activeOnehots = this.updateOnehots(
      this.activePacks,
      this.activeFeatureVectors,
      this.activePools,
      this.currentPack
    );
    this.makePred();
    this.currentPicksActive = true;

    // Resetting event listeners
    for (let i = 0; i < 15; i++) {
      this.elements["DisplayedPack"][i].addEventListener(
        "click",
        this.humanMakesPick
      );
    }
    for (let i = 0; i < 30; i++) {
      this.elements["SideboardArray"][i].src = "";
    }

    // Resetting pool SRCs
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < 30; i++) {
        this.elements["PoolArray"][j][i].src = "";
      }
    }

    // Resetting inner HTML
    this.elements["ScoreHTML"].innerHTML = "Score";
    this.elements["FeedbackHTML"].innerHTML = "";
    setTimeout(() => {
      for (let i = 0; i < 15; i++) {
        this.displayPack(this.activeOnehots[0]);
        this.elements["DisplayedPack"][i].style.animation = "";
        this.elements["DisplayedPack"][i].style.animation = "fadeIn ease 0.25s";
      }
    }, 250);
  };

  ///////////////////////////////// MAIN LOGIC //////////////////////////////////
  humanMakesPick = (event) => {
    // Changing border color of the card the player picked
    if (this.currentPicksActive === true) {
      for (let i = 0; i < 15; i++) {
        this.elements["DisplayedPack"][i].removeEventListener(
          "click",
          this.humanMakesPick
        );
      }
      this.currentPicksActive = false;
      let pickSRC = event.srcElement.src;
      if (this.currentFeedbackActive === true) {
        for (let i = 0; i < this.elements["DisplayedPack"].length; i++) {
          if (this.elements["DisplayedPack"][i].src === pickSRC) {
            //using ID instead of classname here because it's easier + faster to remove between card draws:
            this.elements["DisplayedPack"][i].id = "orangeSelect";
          }
        }
      }
      // Highlighting bot pick and calculating accuracy of human pick
      let pickName = this.masterHash["url_to_name"][pickSRC];
      let pickIndex = this.masterHash["name_to_index"][pickName];

      this.activePicks = JSON.parse(JSON.stringify(this.activePreds)); //this creates a deepcopy, because JS using shallowcopy for arrays
      this.activePicks[0] = pickIndex;
      this.updateActivePools(this.activePicks);
      this.displayBotPred(this.activePreds[0]);
      this.displayPickAccuracy(
        this.activePickSoftmax,
        this.activePicks,
        this.activePreds
      );

      // Updating event listeners
      setTimeout(() => {
        for (let i = 0; i < 15; i++) {
          if (this.currentFeedbackActive === false) {
            this.humanSeesResults();
          } else {
            this.elements["DisplayedPack"][i].addEventListener(
              "click",
              this.humanSeesResults
            );
          }
        }
      }, 250);
    }
  };
  humanSeesResults = () => {
    if (this.currentPicksActive === false) {
      for (let i = 0; i < 15; i++) {
        this.elements["DisplayedPack"][i].removeEventListener(
          "click",
          this.humanSeesResults
        );
        this.elements["DisplayedPackDiv"][i].style.animation =
          "fadeOut ease 0.3s";
      }
      this.updatePick();
      if (this.currentPick < 45) {
        this.updatePools(this.activePicks, this.activePools);
        this.activeFeatureVectors = this.updateFeatureVectors(
          this.activePicks,
          this.activeFeatureVectors
        );
        this.activePacks = this.updatePacks(
          this.currentPick,
          this.activePacks,
          this.activePicks
        );
        this.activeOnehots = this.updateOnehots(
          this.activePacks,
          this.activeFeatureVectors,
          this.activePools,
          this.currentPack
        );
        this.makePred();
        this.makeHeuristicPreds();
        this.currentPicksActive = true;
        this.displayRemoveBorders();
        this.currentMainDeckCount++;
        setTimeout(() => {
          for (let i = 0; i < 15; i++) {
            this.displayPack(this.activeOnehots[0]);
            this.elements["DisplayedPackDiv"][i].style.animation = "";
            this.elements["DisplayedPackDiv"][i].style.animation =
              "fadeIn ease 0.3s";
          }
        }, 210);

        setTimeout(() => {
          for (let m = 0; m < 15; m++) {
            this.elements["DisplayedPack"][m].addEventListener(
              "click",
              this.humanMakesPick
            );
          }
        }, 500);
      } else {
        this.updateDraftIfOver();
      }
      this.elements["FeedbackHTML"].style.opacity = 0;
    }
  };
  setupAfterPromise(data) {
    this.masterHash = data[1];
    this.model = data[0];
    if (data[2]) {
      this.ratings = data[2];
    }
    this.activePools = this.generateActivePools();
    this.activeFeatureVectors = this.generateActiveFeatures();
    [
      this.commons,
      this.uncommons,
      this.rares,
      this.mythics,
      this.specialSlot,
    ] = this.generateRarityArrays();
    this.activePacks = this.generateActivePacks();
    this.activeOnehots = this.updateOnehots(
      this.activePacks,
      this.activeFeatureVectors,
      this.activePools,
      this.currentPack
    );
    this.elements["LoadingSpinner"].style.display = "none";
    this.displayPack(this.activeOnehots[0]);
    this.makePred();
    this.currentPicksActive = true;
    if (this.MLPreds === false) {
      this.displayFeedbackToggle();
    }
  }
}
