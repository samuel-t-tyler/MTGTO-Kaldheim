"use strict";

class DraftSimPackage {
  constructor(
    set,
    setSize,
    inputSize,
    oddsOfRare,
    landSlot = ["Mountain", "Swamp", "Forest", "Plains", "Island"]
  ) {
    this.set = set; //String of the set name
    this.setSize = setSize; //Number of cards in the set
    this.inputSize = inputSize; //Size of the input array into the neural net
    this.oddsOfRare = oddsOfRare; //Odds of opening a rare in any given pack, relateive to a mythic (0-1)
    this.landSlot = landSlot; //Array of strings that represent the unique set of cards that can be in the land slot for a se
  }
  // Critical variables
  masterHash; // Layered object that can take any card representation and turn into any other card representation
  model; //Tensorflow JS model file
  // Variables used to maintain the gamestate
  score = 0;
  currentPick = 0;
  currentPack = 0;
  picksActive = false;
  feedbackActive = true;
  poolToggled = false;
  draftOver = false;

  // Variables that store the active state of players (human and bots)
  activePacks; // Onehot array of shape [8, 3, 280] representing all packs in the draft
  activeOnehots; // Array of shape [8, 574] representing the vector being fed into the prediction matrix
  activePreds; // Array of length 8 representing the bot pred of each pick being made
  activePicks; // Array of length 8 representing each being made.  For human, it is their choice
  activeFeatureVectors; // Array of shape [8, 14] representing all players feature vectors
  activePools; //Array of shape [8, 280] representing all pools for all players
  activePickSoftmax; // the softmax output of the human pick
  prevActivePicks; // the previous active pick made by all bots and humans
  prevPrevActivePicks; // 2 picks back active pick made by all bots and humans

  activePoolUrls = [[], [], [], [], [], []];
  poolSideboard = [[], [], [], [], [], []];

  commons = [];
  uncommons = [];
  rares = [];
  mythics = [];

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

  ///////////////////////////////// CREATING HTML //////////////////////////////////
  createPackHTML(main) {
    for (let i = 0; i < 15; i++) {
      let imageDiv = document.createElement("div");
      let imageElement = document.createElement("img");
      imageDiv.className = "pack-card-image-div";
      imageElement.className = "pack-card-image rounded noSelect zoom";
      imageDiv.appendChild(imageElement);
      main.appendChild(imageDiv);
    }
  }


  createPoolHTML(colsArray) {
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < 30; i++) {  //Note i starts at one
        let imageDiv = document.createElement("div");
        let imageElement = document.createElement("img")
        let breakDiv = document.createElement("div")
        breakDiv.className = "w-100"
        imageDiv.className = "col pool-col";
        imageElement.className = `pool-card-image noSelect ${j+1}-cmc-image zoom`;
        if (i < 9) {
          imageElement.id = `${j+1}-0${i+1}`
        } else {
          imageElement.id = `${j+1}-${i+1}`;
        }
        imageDiv.appendChild(imageElement);
        colsArray[j].appendChild(imageDiv);
        colsArray[j].appendChild(breakDiv);
      }
    }
  }

  ///////////////////////////////// HELPER FUNCTIONS //////////////////////////////////
  findContense(onehot) {
    let outputArray = [];
    for (let i = 0; i < onehot.length; i++) {
      if (onehot[i] > 0) {
        outputArray.push(this.masterHash["index_to_name"][i]);
      }
    }
    return outputArray;
  }
  findSum(onehot) {
    let count = 0;
    for (let i = 0; i < onehot.length; i++) {
      count += onehot[i];
    }
    return count;
  }

  ////////////////////////////// GENERATING ACTIVE VARIABLES ///////////////////////////////
  // Populating the arrays of cards
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
        !this.landSlot.includes(cardsAvailable[m])
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
      this.landSlot,
    ];
  };
  // Creating function to create arrays to represent players pools
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
  //Creating function to represent player feature vectors
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
    let activePackTemp;
    (activePackTemp = []).length = 280;
    activePackTemp.fill(0);
    let pack = [];
    const cards = [this.commons, this.uncommons, this.landSlot];
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
  };

  // Function to generate array of 8 arrays of 3 packs
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
  //Function that makes a prediction for all players
  makeBatchPreds = (arrayOfOnehots) => {
    //save previous active picks
    this.prevPrevActivePicks = this.prevActivePicks;
    this.prevActivePicks = this.activePicks;
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
    return [this.activePreds, this.activePickSoftmax];
  };
  ///////////////////////////////// DISPLAY //////////////////////////////////
  // Change the displayed pack SRCs to the image of the current pack
  displayPack = (playerOnehot) => {
    let humanPlayerActivePack = playerOnehot.slice(
      this.setSize,
      this.setSize * 2
    );
    let arrayOfURLs = [];
    for (let z = 0; z < 15; z++) {
      displayedPack[z].style.display = "block";
      displayedPack[z].src = "";
      displayedPack[z].style.border = "transparent";
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
        displayedPack[k].src = arrayOfSortedURLS[k];
      }
  };

  generatePickAccuracy = (activePickSoftmax, picks, preds) => {
    scoreHTML.style.opacity = 0;
    setTimeout(() => {
      feedbackHTML.style.opacity = 1;
      let botPickSoftmax = activePickSoftmax[preds[0]];
      let humanPickSoftmax = activePickSoftmax[picks[0]];
      let error = 1 - humanPickSoftmax / botPickSoftmax;
      let pickValue = -Math.pow(error, 2.8) + 1;
      this.score += pickValue;
      let scoreFixed = this.score.toFixed(1);
      feedbackHTML.style.color = "white";
      if (scoreFixed[scoreFixed.length - 1] === "0") {
        scoreFixed = this.score.toFixed(0);
      }
      scoreHTML.innerHTML = `${scoreFixed} / ${this.currentPick + 1}`;
      if (pickValue >= 0.95) {
        feedbackHTML.innerHTML = "Excellent!";
      }
      if (pickValue >= 0.7 && pickValue < 0.95) {
        feedbackHTML.innerHTML = "Great!";
      }
      if (pickValue >= 0.5 && pickValue < 0.7) {
        feedbackHTML.innerHTML = "Not bad!";
      }
      if (pickValue >= 0.3 && pickValue < 0.5) {
        feedbackHTML.innerHTML = "Possible Mistake";
      }
      if (pickValue < 0.3) {
        feedbackHTML.innerHTML = "Mistake";
      }
      scoreHTML.style.opacity = 1;
    }, 150);
    return;
  };

  ///////////////////////////////// DISPLAY //////////////////////////////////
  // Highlight the pick the bot likes
  displayBotPred = (pred) => {
    if (this.feedbackActive === true) {
      let predURL = this.masterHash["index_to_url"][pred];
      for (let i = 0; i < displayedPack.length; i++) {
        if (displayedPack[i].src === predURL) {
          displayedPack[i].style.border = "thick solid #33cc33";
        }
      }
    }
    return;
  };
  // Function that displays the images of the cards you have selected in the pool tab
  displayPoolImages = (picks) => {
    let humanPick = this.masterHash["index_to_name"][picks[0]];
    let humanPickCMC = this.masterHash["name_to_cmc"][humanPick];
    let humanPickURL = this.masterHash["name_to_url"][humanPick][
      this.masterHash["name_to_url"][humanPick].length - 1
    ];
    if (humanPickCMC < 1) {
      this.activePoolUrls[0].push(humanPickURL);
    } else if (humanPickCMC < 7) {
      this.activePoolUrls[humanPickCMC - 1].push(humanPickURL);
    } else {
      this.activePoolUrls[5].push(humanPickURL);
    }
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < this.activePoolUrls[j].length; i++) {
        poolArray[j][i].src = this.activePoolUrls[j][i];
      }
    }
    return;
  };
  //  Function that resets pool after you remove a card from it and hide it in the sideboard
  displayPoolAfterSideboard = (event) => {
    const clicked = event.srcElement.id;
    const pile = clicked[0];
    const index = parseInt(clicked.slice(2, 4)); //note that index is one above the index used in array
    const cutURL = this.activePoolUrls[pile - 1].splice(index - 1, 1);
    this.poolSideboard[pile - 1].push(cutURL[0]);
    for (let k = 0; k < 30; k++) {
      poolArray[pile - 1][k].src = "";
    }
    for (let z = 0; z < this.activePoolUrls[pile - 1].length; z++) {
      poolArray[pile - 1][z].src = this.activePoolUrls[pile - 1][z];
    }
    return;
  };
  // Function that resets pool images after you click the button and returns sideboard cards to maindeck
  displayPoolAfterReset = () => {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < this.poolSideboard[i].length; j++) {
        this.activePoolUrls[i].push(this.poolSideboard[i][j]);
      }
    }
    for (let k = 0; k < 6; k++) {
      for (let l = 0; l < this.activePoolUrls[k].length; l++) {
        poolArray[k][l].src = this.activePoolUrls[k][l];
      }
    }
    this.poolSideboard = [[], [], [], [], [], []];
  };

  // Function that hides or displays player feedback based on user input in the menu
  displayFeedbackToggle = () => {
    if (this.feedbackActive === true) {
      feedbackHTML.style.visibility = "hidden";
      scoreHTML.style.visibility = "hidden";
      this.feedbackActive = false;
      return;
    }
    if (this.feedbackActive === false) {
      feedbackHTML.style.visibility = "visible";
      scoreHTML.style.visibility = "visible";
      this.feedbackActive = true;
      return;
    }
  };

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
    if (this.poolToggled === false) {
      this.poolToggled = true;
      restartIcon.style.display = "none";
      restartText.style.display = "none";
    } else {
      this.poolToggled = false;
      if (this.draftOver === true) {
        restartIcon.style.display = "block";
        restartText.style.display = "block";
      }
    }
  };

  // Function that prepares logic for player resetting draft on click
  updateDraftIfOver = () => {
    if (this.currentPick === 45) {
      for (let i = 0; i < this.displayPack.length; i++) {
        displayedPack[i].style.display = "none";
        displayedPack[i].style.border = "transparent";
      }
      restartText.style.display = "block";
      restartIcon.style.display = "block";
      restartText.addEventListener("click", resetDraft);
      restartIcon.addEventListener("click", resetDraft);
    }
    this.draftOver = true;
  };
  ////////////////////////////////// END DRAFT ////////////////////////////////////

  // Function that resets the gamestate from the beginning
  resetDraft = () => {
    // resetting all varaiables that store gamestate
    for (let i = 0; i < 15; i++) {
      displayedPackDiv[i].style.animation = "fadeOut ease 0.25s";
    }
    this.score = 0;
    this.currentPick = 0;
    this.currentPack = 0;
    this.picksActive = false;
    this.feedbackActive = true;
    this.activePacks = [];
    this.activeOnehots = [];
    this.activePreds = [];
    this.activePicks = [];
    this.activeFeatureVectors = this.generateActiveFeatures();
    this.activePools = this.generateActivePools();
    this.activePickSoftmax = [];
    this.activePoolUrls = [[], [], [], [], [], []];
    this.poolSideboard = [[], [], [], [], [], []];
    this.prevActivePicks = []; // the previous active pick made by all the bots
    this.prevPrevActivePicks = []; // two picks back
    restartIcon.style.display = "none";
    restartText.style.display = "none";
    this.draftOver = false;

    // generating new packs and startingone onehots and preds
    this.activePacks = this.generateActivePacks();
    console.log(this.findContense(this.activePacks[0][0]));
    this.activeOnehots = this.updateOnehots(
      this.activePacks,
      this.activeFeatureVectors,
      this.activePools,
      this.currentPack
    );
    [this.activePreds, this.activePickSoftmax] = this.makeBatchPreds(
      this.activeOnehots
    );
    this.picksActive = true;

    // Resetting event listeners
    for (let i = 0; i < 15; i++) {
      displayedPack[i].addEventListener("click", this.humanMakesPick);
    }

    // Resetting pool SRCs
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < 15; i++) {
        poolArray[j][i].src = "";
      }
    }

    // Resetting inner HTML
    scoreHTML.innerHTML = "Score";
    feedbackHTML.innerHTML = "";
    setTimeout(() => {
      for (let i = 0; i < 15; i++) {
        this.displayPack(this.activeOnehots[0]);
        displayedPackDiv[i].style.animation = "";
        displayedPackDiv[i].style.animation = "fadeIn ease 0.25s";
      }
    }, 250);
  };

  ///////////////////////////////// UPDATEFUNCS //////////////////////////////////
  humanMakesPick = (event) => {
    // Changing border color of the card the player picked
    if (this.picksActive === true) {
      for (let i = 0; i < 15; i++) {
        displayedPack[i].removeEventListener("click", this.humanMakesPick);
      }
      this.picksActive = false;
      let pickSRC = event.srcElement.src;
      for (let i = 0; i < displayedPack.length; i++) {
        if (displayedPack[i].src === pickSRC) {
          displayedPack[i].style.border = "thick solid #ff9966";
        }
      }
      // Highlighting bot pick and calculating accuracy of human pick
      let pickName = this.masterHash["url_to_name"][pickSRC];
      let pickIndex = this.masterHash["name_to_index"][pickName];

      this.activePicks = JSON.parse(JSON.stringify(this.activePreds)); //this creates a deepcopy, because JS using shallowcopy for arrays
      this.activePicks[0] = pickIndex;

      this.displayBotPred(this.activePreds[0]);
      this.generatePickAccuracy(
        this.activePickSoftmax,
        this.activePicks,
        this.activePreds
      );

      // Updating event listeners
      setTimeout(() => {
        for (let i = 0; i < 15; i++) {
          displayedPack[i].addEventListener("click", this.humanSeesResults);
        }
      }, 250);
    }
  };
  humanSeesResults = () => {
    if (this.picksActive === false) {
      for (let i = 0; i < 15; i++) {
        displayedPack[i].removeEventListener("click", this.humanSeesResults);
        displayedPackDiv[i].style.animation = "fadeOut ease 0.3s";
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
        [this.activePreds, this.activePickSoftmax] = this.makeBatchPreds(
          this.activeOnehots
        );
        this.picksActive = true;
        this.displayPoolImages(this.activePicks);
        setTimeout(() => {
          for (let i = 0; i < 15; i++) {
            this.displayPack(this.activeOnehots[0]);
            displayedPackDiv[i].style.animation = "";
            displayedPackDiv[i].style.animation = "fadeIn ease 0.3s";
          }
        }, 210);

        setTimeout(() => {
          for (let m = 0; m < 15; m++) {
            displayedPack[m].addEventListener("click", this.humanMakesPick);
          }
        }, 500);
      } else {
        this.updateDraftIfOver();
      }
      feedbackHTML.style.opacity = 0;
    }
  };
  setupAfterPromise(data) {
    this.masterHash = data[1];
    this.model = data[0];
    this.activePools = this.generateActivePools();
    this.activeFeatureVectors = this.generateActiveFeatures();
    [
      this.commons,
      this.uncommons,
      this.rares,
      this.mythics,
      this.landSlot,
    ] = this.generateRarityArrays();
    this.activePacks = this.generateActivePacks();
    this.activeOnehots = this.updateOnehots(
      this.activePacks,
      this.activeFeatureVectors,
      this.activePools,
      this.currentPack
    );
    loadingText.style.display = "none";
    loadingSpinner.style.display = "none";
    this.displayPack(this.activeOnehots[0]);
    [this.activePreds, this.activePickSoftmax] = this.makeBatchPreds(
      this.activeOnehots
    );
    this.picksActive = true;
  }
}
