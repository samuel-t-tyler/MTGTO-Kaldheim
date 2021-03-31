class DraftSimPackage {
  constructor(set) {
      this.set = set;
      this.humanMakesPick = this.humanMakesPick.bind(this)
  }

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
  findContense(onehot) {
    let outputArray = [];
    for (let i = 0; i < onehot.length; i++) {
      if (onehot[i] > 0) {
        outputArray.push(masterHash["index_to_name"][i]);
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
  // Creating function to create arrays to represent players pools
  generateActivePools() {
    let activePoolsTemp = [];
    let pool;
    for (let i = 0; i < 8; i++) {
      (pool = []).length = setSize;
      pool.fill(0);
      activePoolsTemp.push(pool);
    }
    return activePoolsTemp;
  }
  //Creating function to represent player feature vectors
  generateActiveFeatures() {
    let activeFeatureVectors = [];
    let features;
    for (let i = 0; i < 8; i++) {
      (features = []).length = 14;
      features.fill(0);
      activeFeatureVectors.push(features);
    }
    return activeFeatureVectors;
  }
  // Function to generate a random pack of Kaldheim cards
  generatePack() {
    let activePackTemp;
    (activePackTemp = []).length = 280;
    activePackTemp.fill(0);
    let pack = [];
    const cards = [commons, uncommons, snowLands];
    const quantity = [10, 3, 1];

    // add commons, uncommons, snow lands
    for (let i = 0; i < 3; i++) {
      let shuffled = cards[i].sort(() => 0.5 - Math.random());
      // Get sub-array of first n elements after shuffled
      let selected = shuffled.slice(0, quantity[i]);
      for (j = 0; j < quantity[i]; j++) {
        pack.push(selected[j]);
      }
    }
    // add rare/mythic
    let randomNum = Math.random();
    if (randomNum > oddsOfRare) {
      let shuffled = mythics.sort(() => 0.5 - Math.random());
      let selected = shuffled.slice(0, 1);
      pack.push(selected);
    } else {
      let shuffled = rares.sort(() => 0.5 - Math.random());
      let selected = shuffled.slice(0, 1);
      pack.push(selected);
    }

    for (let card = 0; card < 15; card++) {
      activePackTemp[masterHash["name_to_index"][pack[card]]] = 1;
    }
    return activePackTemp;
  }

  // Function to generate array of 8 arrays of 3 packs
  generateActivePacks() {
    let activePacksTemp = [];
    for (let l = 0; l < 8; l++) {
      let temp = [];
      for (let k = 0; k < 3; k++) {
        let pack = DraftMethods.generatePack();
        temp.push(pack);
      }
      activePacksTemp.push(temp);
    }
    return activePacksTemp;
  }

  ///////////////////////////////// MAKING PREDICTIONS //////////////////////////////////

  //Function that makes a prediction for all players
  makeBatchPreds(arrayOfOnehots) {
    //save previous active picks
    prevPrevActivePicks = prevActivePicks;
    prevActivePicks = activePicks;
    // generating packs to multiply predictions by
    let arrayOfPacks = [];
    for (let k = 0; k < arrayOfOnehots.length; k++) {
      arrayOfPacks.push(arrayOfOnehots[k].slice(setSize, setSize * 2));
    }
    //generating preds
    let predRaw = model.predict(tf.reshape(arrayOfOnehots, [8, inputSize]));
    const v = predRaw.dataSync();

    //Saving the softmax activations for the human pick
    let activePickSoftmax = [];
    for (let q = 0; q < setSize; q++) {
      activePickSoftmax.push(v[q] * arrayOfPacks[0][q]);
    }
    //Saving the argmax preds for each player
    let arrayOfIndexes = [];
    for (let k = 0; k < 8; k++) {
      let max_value = 0;
      let max_value_index = 275;
      let arrayOfPred = v.slice(k * setSize, (k + 1) * setSize);
      let packLimitedPred = [];
      for (let z = 0; z < arrayOfPred.length; z++) {
        packLimitedPred.push(arrayOfPred[z] * arrayOfPacks[k][z]);
      }
      max_value = 0;
      for (i = 0; i < packLimitedPred.length; i++) {
        if (packLimitedPred[i] > max_value) {
          max_value = packLimitedPred[i];
          max_value_index = i;
        }
      }
      arrayOfIndexes.push(max_value_index);
    }
    activePreds = arrayOfIndexes;
    return [activePreds, activePickSoftmax];
  }
  ///////////////////////////////// DISPLAY //////////////////////////////////

  // Change the displayed pack SRCs to the image of the current pack
  displayPack(playerOnehot) {
    let humanPlayerActivePack = playerOnehot.slice(setSize, setSize * 2);
    let arrayOfURLs = [];
    for (let z = 0; z < 15; z++) {
      displayedPack[z].style.display = "block";
      displayedPack[z].src = "";
      displayedPack[z].style.border = 0;
    }
    for (let i = 0; i < humanPlayerActivePack.length; i++) {
      if (humanPlayerActivePack[i] > 0) {
        arrayOfURLs.push(masterHash["index_to_url"][i]);
      }
    }
    //Sort URLS by rarity
    let arrayOfSortedURLS = [];
    let rares = [];
    let uncommons = [];
    let commons = [];
    for (let m = 0; m < arrayOfURLs.length; m++) {
      let cardName = masterHash["url_to_name"][arrayOfURLs[m]];
      let rarity = masterHash["name_to_rarity"][cardName];
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
  }

  generatePickAccuracy(activePickSoftmax, picks, preds) {
    let botPickSoftmax = activePickSoftmax[preds[0]];
    let humanPickSoftmax = activePickSoftmax[picks[0]];
    let error = 1 - humanPickSoftmax / botPickSoftmax;
    let pickValue = -Math.pow(error, 2.8) + 1;
    score += pickValue;
    let scoreFixed = score.toFixed(1);
    feedbackHTML.style.color = "white";
    if (scoreFixed[scoreFixed.length - 1] === "0") {
      scoreFixed = score.toFixed(0);
    }
    scoreHTML.innerHTML = `${scoreFixed} / ${currentPick + 1}`;
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
      feedbackHTML.innerHTML = "Potential Mistake";
    }
    if (pickValue < 0.3) {
      feedbackHTML.innerHTML = "Mistake";
    }
    return pickValue;
  }
  // Highlight the pick the bot likes
  displayBotPred(pred) {
    if (feedbackActive === true) {
      let predURL = masterHash["index_to_url"][pred];
      for (i = 0; i < displayedPack.length; i++) {
        if (displayedPack[i].src === predURL) {
          displayedPack[i].style.border = "thick solid #33cc33";
        }
      }
    }
    return;
  }
  // Function that displays the images of the cards you have selected in the pool tab
  displayPoolImages(picks) {
    let humanPick = masterHash["index_to_name"][picks[0]];
    let humanPickCMC = masterHash["name_to_cmc"][humanPick];
    let humanPickURL =
      masterHash["name_to_url"][humanPick][
        masterHash["name_to_url"][humanPick].length - 1
      ];
    if (humanPickCMC < 1) {
      activePoolUrls[0].push(humanPickURL);
    } else if (humanPickCMC < 7) {
      activePoolUrls[humanPickCMC - 1].push(humanPickURL);
    } else {
      activePoolUrls[5].push(humanPickURL);
    }
    for (let j = 0; j < 6; j++) {
      for (i = 0; i < activePoolUrls[j].length; i++) {
        poolArray[j][i].src = activePoolUrls[j][i];
      }
    }
    return;
  }
  //  Function that resets pool after you remove a card from it and hide it in the sideboard
  displayPoolAfterSideboard() {
    const clicked = this.id;
    const pile = clicked[0];
    const index = parseInt(clicked.slice(2, 4)); //note that index is one above the index used in array
    const cutURL = activePoolUrls[pile - 1].splice(index - 1, 1);
    poolSideboard[pile - 1].push(cutURL[0]);
    for (let k = 0; k < 15; k++) {
      poolArray[pile - 1][k].src = "";
    }
    for (let z = 0; z < activePoolUrls[pile - 1].length; z++) {
      poolArray[pile - 1][z].src = activePoolUrls[pile - 1][z];
    }
    return;
  }
  // Function that resets pool images after you click the button and returns sideboard cards to maindeck
  displayPoolAfterReset() {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < poolSideboard[i].length; j++) {
        activePoolUrls[i].push(poolSideboard[i][j]);
      }
    }
    for (let k = 0; k < 6; k++) {
      for (let l = 0; l < activePoolUrls[k].length; l++) {
        poolArray[k][l].src = activePoolUrls[k][l];
      }
    }
    poolSideboard = [[], [], [], [], [], []];
  }

  // Function that hides or displays player feedback based on user input in the menu
  displayFeedbackToggle() {
    if (feedbackActive === true) {
      feedbackHTML.style.visibility = "hidden";
      scoreHTML.style.visibility = "hidden";
      feedbackActive = false;
      return;
    }
    if (feedbackActive === false) {
      feedbackHTML.style.visibility = "visible";
      scoreHTML.style.visibility = "visible";
      feedbackActive = true;
      return;
    }
  }

  ///////////////////////////////// UPDATE LOGIC //////////////////////////////////

  // Function that updates feature vectors
  updateFeatureVectors(picks, featureVectors = activeFeatureVectors) {
    for (let i = 0; i < 8; i++) {
      let predName = masterHash["index_to_name"][picks[i]];
      let predColor = masterHash["name_to_color"][predName];
      let predCMC = masterHash["name_to_cmc"][predName];
      if (predColor.length === 0) {
        featureVectors[i][DraftMethods.feature_vector_index["Colorless"]] += 1;
      } else {
        for (let m = 0; m < predColor.length; m++) {
          featureVectors[i][DraftMethods.feature_vector_index[predColor[m]]] +=
            1 / predColor.length;
        }
      }
      if (predCMC > 7) {
        featureVectors[i][DraftMethods.feature_vector_index[7.0]] += 1;
      } else {
        featureVectors[i][DraftMethods.feature_vector_index[predCMC]] += 1;
      }
    }
    return featureVectors;
  }

  // Function that adds the prediction to the pool onehot of all 7 bots and human player
  updatePools(picks, arrayOfPools) {
    for (let i = 0; i < 8; i++) {
      arrayOfPools[i][picks[i]] += 1.5;
    }
  }

  // Function that updates the nested arrays that represent the cards in each pack after each player makes a pick
  updatePacks(
    count = currentPick,
    draftPack = activePacks,
    picks = activePicks
  ) {
    let pack = Math.floor(currentPick / 15);
    let arrayOfActivePacks = [];
    if (count !== 15 && count !== 30) {
      for (i = 0; i < 8; i++) {
        draftPack[i][pack][picks[i]] = 0;
        arrayOfActivePacks.push(draftPack[i][pack]);
      }
      if (currentPack !== 1) {
        let last = arrayOfActivePacks.pop();
        arrayOfActivePacks.unshift(last);
        for (j = 0; j < 8; j++) {
          activePacks[j][pack] = arrayOfActivePacks[j];
        }
      } else {
        first = arrayOfActivePacks.shift();
        arrayOfActivePacks.push(first);
        for (j = 0; j < 8; j++) {
          activePacks[j][pack] = arrayOfActivePacks[j];
        }
      }
    }
    return activePacks;
  }

  // Function that takes players features, pools and pack and generates concatenated array
  updateOnehots(packs, features, pools, packnum) {
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
  }

  // Updates the global gamestate variables to signify a new turn
  updatePick() {
    currentPick++;
    currentPack = Math.floor(currentPick / 15);
  }
  // Function that updates what is displayed when the pool window button is toggled
  updatePoolToggled() {
    if (poolToggled === false) {
      poolToggled = true;
      restartIcon.style.display = "none";
      restartText.style.display = "none";
    } else {
      poolToggled = false;
      if (draftOver === true) {
        restartIcon.style.display = "block";
        restartText.style.display = "block";
      }
    }
  }

  // Function that prepares logic for player resetting draft on click
  updateDraftIfOver() {
    if (currentPick === 45) {
      for (let i = 0; i < DraftMethods.displayPack.length; i++) {
        displayedPack[i].style.display = "none";
        displayedPack[i].style.borderRadius = "0px";
        displayedPack[i].style.border = "none";
      }
      restartText.style.display = "block";
      restartIcon.style.display = "block";
      restartText.addEventListener("click", resetDraft);
      restartIcon.addEventListener("click", resetDraft);
    }
    draftOver = true;
  }
  ////////////////////////////////// END DRAFT ////////////////////////////////////

  // Function that resets the gamestate from the beginning
  resetDraft() {
    // resetting all varaiables that store gamestate
    score = 0;
    currentPick = 0;
    currentPack = 0;
    picksActive = false;
    feedbackActive = true;
    activePacks = [];
    activeOnehots = [];
    activePreds = [];
    activePicks = [];
    activeFeatureVectors = DraftMethods.generateActiveFeatures();
    activePools = DraftMethods.generateActivePools();
    activePickSoftmax = [];
    activePoolUrls = [[], [], [], [], [], []]; //array of 6 arrays representing pool pile urls
    sideboardPoolOneCmc = [];
    sideboardPoolTwoCmc = [];
    sideboardPoolThreeCmc = [];
    sideboardPoolFourCmc = [];
    sideboardPoolFiveCmc = [];
    sideboardPoolSixCmc = [];
    poolSideboard = [
      sideboardPoolOneCmc,
      sideboardPoolTwoCmc,
      sideboardPoolThreeCmc,
      sideboardPoolFourCmc,
      sideboardPoolFiveCmc,
      sideboardPoolSixCmc,
    ];
    prevActivePicks = []; // the previous active pick made by all the bots
    prevPrevActivePicks = []; // two picks back
    restartIcon.style.display = "none";
    restartText.style.display = "none";
    draftOver = false;

    // generating new packs and startingone onehots and preds
    let [
      commons,
      uncommons,
      rares,
      mythics,
      snowLands,
    ] = generateRarityArrays();
    activePacks = DraftMethods.generateActivePacks();
    activeOnehots = DraftMethods.updateOnehots(
      activePacks,
      activeFeatureVectors,
      activePools,
      currentPack
    );
    DraftMethods.displayPack(activeOnehots[0]);
    [activePreds, activePickSoftmax] = DraftMethods.makeBatchPreds(
      activeOnehots
    );
    picksActive = true;

    // Resetting event listeners
    for (i = 0; i < 15; i++) {
      displayedPack[i].addEventListener("click", humanMakesPick);
    }

    // Resetting pool SRCs
    for (j = 0; j < 6; j++) {
      for (i = 0; i < 15; i++) {
        poolArray[j][i].src = "";
      }
    }

    // Resetting inner HTML
    scoreHTML.innerHTML = "Score";
    feedbackHTML.innerHTML = "";
    }

///////////////////////////////// UPDATEFUNCS //////////////////////////////////
    humanMakesPick( ) {
        // Changing border color of the card the player picked
        if (picksActive === true) {
            for (let i = 0; i < 15; i++) {
            displayedPack[i].removeEventListener("click", this.humanMakesPick);
            }
            picksActive = false;
            let pickSRC = this.src;
            for (i = 0; i < displayedPack.length; i++) {
            if (displayedPack[i].src === pickSRC) {
                displayedPack[i].style.border = "thick solid #ff9966";
            }
            }
            // Highlighting bot pick and calculating accuracy of human pick
            let pickName = masterHash["url_to_name"][pickSRC];
            let pickIndex = masterHash["name_to_index"][pickName];

            let activePicks = JSON.parse(JSON.stringify(activePreds)); //this creates a deepcopy, because JS using shallowcopy for arrays
            activePicks[0] = pickIndex;

            
            this.displayBotPred(activePreds[0]);
            this.generatePickAccuracy(activePickSoftmax, activePicks, activePreds);

            // Updating event listeners
            setTimeout(() => {
            for (let i = 0; i < 15; i++) {
                displayedPack[i].addEventListener("click", humanSeesResults);
            }
            }, 100);
        }
    }
}
