///////////////////////////////// TO TEST, RUN ON LOCAL SERVER //////////////////////////////////
// python -m http.server (in console)
// http://localhost:8000/OneDrive/Desktop/coding/draft_sim_website/

///////////////////////////////// DEFINING GLOBAL VARIABLES //////////////////////////////////
// Fetching relevant cards by class, defining global variables
let displayedPack = document.getElementsByClassName("pack-card-image");

let scoreHTML = document.getElementById("score");
let feedbackHTML = document.getElementById("feedback");
let loadingText = document.getElementById("loadingText");
let loadingSpinner = document.getElementById("loadingSpinner");
let restartText = document.getElementById("restartText")
let restartIcon = document.getElementById("restartIcon")
let poolToggle = document.getElementById("pool-toggler");

let resetSideboardButton = document.getElementById("resetSideboard");
let toggleFeedbackButton = document.getElementById("toggleFeedback");
let resetDraftButton = document.getElementById("resetDraft")

let poolOneCmc = document.getElementsByClassName("one-cmc-image");
let poolTwoCmc = document.getElementsByClassName("two-cmc-image");
let poolThreeCmc = document.getElementsByClassName("three-cmc-image");
let poolFourCmc = document.getElementsByClassName("four-cmc-image");
let poolFiveCmc = document.getElementsByClassName("five-cmc-image");
let poolSixCmc = document.getElementsByClassName("six-cmc-image");
let poolArray = [poolOneCmc, poolTwoCmc, poolThreeCmc, poolFourCmc, poolFiveCmc, poolSixCmc];

// General variables used to store static information about the set
const setSize = 280;
const inputSize = 574;
const oddsOfRare = 0.875;

// Counters used to maintain the gamestate
let score = 0;
let currentPick = 0;
let currentPack = 0;
let picksActive = false;
let feedbackActive = true;
let poolToggled = false;
let draftOver = false;

// Variables that store the active state of players (human and bots)
let activePacks; // Onehot array of shape [8, 3, 280] representing all packs in the draft
let activeOnehots; // Array of shape [8, 574] representing the vector being fed into the prediction matrix
let activePreds; // Array of length 8 representing the bot pred of each pick being made
let activePicks; // Array of length 8 representing each being made.  For human, it is their choice
let activeFeatureVectors; // Array of shape [8, 14] representing all players feature vectors
let activePools; //Array of shape [8, 280] representing all pools for all players
let activePickSoftmax;  // the softmax output of the human pick
let activePoolUrls = [[], [], [], [], [], []] //array of 6 arrays representing pool pile urls
let sideboardPoolOneCmc = [];
let sideboardPoolTwoCmc = [];
let sideboardPoolThreeCmc = [];
let sideboardPoolFourCmc = [];
let sideboardPoolFiveCmc = [];
let sideboardPoolSixCmc = [];
let poolSideboard = [sideboardPoolOneCmc, sideboardPoolTwoCmc, sideboardPoolThreeCmc, sideboardPoolFourCmc, sideboardPoolFiveCmc, sideboardPoolSixCmc];

let prevActivePicks;  // the previous active pick made by all the bots
let prevPrevActivePicks;  // two picks back

///////////////////////////////// HELPER FUNCTIONS //////////////////////////////////
function findContense(onehot) {
  outputArray = [];
  for (i = 0; i < onehot.length; i++) {
    if (onehot[i] > 0) {
      outputArray.push(masterHash["index_to_name"][i]);
    }
  }
  return outputArray;
}

function findSum(onehot) {
  count = 0;
  for (i = 0; i < onehot.length; i++) {
    count += onehot[i]
  }
  return count
}
///////////////////////////////// GENERATING ACTIVE VARIABLES //////////////////////////////////

// Creating function to create arrays to represent players pools
function generateActivePools() {
  let activePoolsTemp = [];
  for (i = 0; i < 8; i++) {
    (pool = []).length = setSize;
    pool.fill(0);
    activePoolsTemp.push(pool);
  }
  return activePoolsTemp;
}
activePools = generateActivePools();

//Creating function to represent player feature vectors
function generateActiveFeatures() {
  let activeFeatureVectors = [];
  for (i = 0; i < 8; i++) {
    (features = []).length = 14;
    features.fill(0);
    activeFeatureVectors.push(features);
  }
  return activeFeatureVectors;
}
activeFeatureVectors = generateActiveFeatures();

// Generate function to split arrays of cards by rarity
function generateRarityArrays() {
  commons = [];
  uncommons = [];
  rares = [];
  mythics = []
  snowLands = [
    "Snow-Covered Mountain",
    "Snow-Covered Island",
    "Snow-Covered Swamp",
    "Snow-Covered Forest",
    "Snow-Covered Plains",
    "Alpine Meadow",
    "Arctic Treeline",
    "Glacial Floodplain",
    "Highland Forest",
    "Ice Tunnel",
    "Rimewood Falls",
    "Snowfield Sinkhole",
    "Sulfurous Mire",
    "Volatile Fjord",
    "Woodland Chasm",
  ];
  cardsAvailable = [];
  for (let key in masterHash["name_to_collector"]) {
    if (masterHash["name_to_collector"][key] < 286) {
      cardsAvailable.push(key);
    }
  }
  for (m = 0; m < cardsAvailable.length; m++) {
    if (masterHash["name_to_rarity"][cardsAvailable[m]] === "common" && !snowLands.includes(cardsAvailable[m])) {
      commons.push(cardsAvailable[m]);
    }
    if (masterHash["name_to_rarity"][cardsAvailable[m]] === "uncommon") {
      uncommons.push(cardsAvailable[m]);
    }
    if (masterHash["name_to_rarity"][cardsAvailable[m]] === "rare") {
      rares.push(cardsAvailable[m]);
    }
    if (masterHash["name_to_rarity"][cardsAvailable[m]] === "mythic"){
      mythics.push(cardsAvailable[m]);
    }
  }
  return [commons, uncommons, rares, mythics, snowLands];
}

// Function to generate a random pack of Kaldheim cards
function generatePack() {
  (activePackTemp = []).length = 280;
  activePackTemp.fill(0);
  pack = [];
  cards = [commons, uncommons, snowLands];
  quantity = [10, 3, 1];

  // add commons, uncommons, snow lands
  for (i = 0; i < 3; i++) {
    let shuffled = cards[i].sort(() => 0.5 - Math.random());
    // Get sub-array of first n elements after shuffled
    let selected = shuffled.slice(0, quantity[i]);
    for (j = 0; j < quantity[i]; j++) {
      pack.push(selected[j]);
    }
  }
  // add rare/mythic
  randomNum = Math.random();
  if (randomNum > oddsOfRare) {
    let shuffled = mythics.sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, 1);
    pack.push(selected);
  } else {
    let shuffled = rares.sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, 1);
    pack.push(selected);
  }

  for (card = 0; card < 15; card++) {
    activePackTemp[masterHash["name_to_index"][pack[card]]] = 1;
  }
  return activePackTemp;
}

// Function to generate array of 8 arrays of 3 packs
function generateActivePacks() {
  activePacksTemp = [];
  for (l = 0; l < 8; l++) {
    temp = [];
    for (k = 0; k < 3; k++) {
      let pack = generatePack();
      temp.push(pack);
    }
    activePacksTemp.push(temp);
  }
  return activePacksTemp;
}

///////////////////////////////// MAKING PREDICTIONS //////////////////////////////////

//Function that makes a prediction for all players
function makeBatchPreds(arrayOfOnehots) {
  //save previous active picks
  prevPrevActivePicks = prevActivePicks
  prevActivePicks = activePicks;
  // generating packs to multiply predictions by
  let arrayOfPacks = [];
  for (k = 0; k < arrayOfOnehots.length; k++) {
    arrayOfPacks.push(arrayOfOnehots[k].slice(setSize, setSize * 2));
  }
  //generating preds
  let predRaw = model.predict(tf.reshape(arrayOfOnehots, [8, inputSize]));
  const v = predRaw.dataSync();

  //Saving the softmax activations for the human pick
  activePickSoftmax = [];
  for (q = 0; q < setSize; q++) {
    activePickSoftmax.push(v[q] * arrayOfPacks[0][q]);
  }
  //Saving the argmax preds for each player
  arrayOfIndexes = []
  for (k = 0; k < 8; k++) {
    let max_value = 0;
    let max_value_index = 275;  
    arrayOfPred = v.slice(k * setSize, (k + 1) * setSize);
    packLimitedPred = [];
    for (z = 0; z < arrayOfPred.length; z++) {
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
  return activePreds;
}

///////////////////////////////// DISPLAY //////////////////////////////////

// Change the displayed pack SRCs to the image of the current pack
function displayPack(playerOnehot) {
  humanPlayerActivePack = playerOnehot.slice(setSize, setSize * 2);
  arrayOfURLs = [];
  for (z = 0; z < 15; z++) {
    displayedPack[z].src = "";  
    displayedPack[z].style.border = 0;
  }
  for (i = 0; i < humanPlayerActivePack.length; i++) {
    if (humanPlayerActivePack[i] > 0) {
      arrayOfURLs.push(masterHash["index_to_url"][i]);
    }
  }
  //Sort URLS by rarity
  arrayOfSortedURLS = []
  rares = [];
  uncommons = [];
  commons = [];
  for (m = 0; m < arrayOfURLs.length; m++) {
    cardName = masterHash["url_to_name"][arrayOfURLs[m]];
    rarity = masterHash["name_to_rarity"][cardName];
    if (rarity === "common") {
      commons.push(arrayOfURLs[m]);
    } else if (rarity === "uncommon") {
      uncommons.push(arrayOfURLs[m]);
    } else {
      rares.push(arrayOfURLs[m]);
    }
  }
  arrayOfSortedURLS = arrayOfSortedURLS.concat(rares, uncommons, commons);

  for (k = 0; k < arrayOfSortedURLS.length; k++) {
    displayedPack[k].src = arrayOfSortedURLS[k];
  }
}

// Highlight the pick the bot likes
function displayBotPred(pred) {
  if (feedbackActive === true) {
    predURL = masterHash["index_to_url"][pred];
    for (i = 0; i < displayedPack.length; i++) {
      if (displayedPack[i].src === predURL) {
        displayedPack[i].style.border = "thick solid #33cc33";
      }
    }
  }
  return;
}

function displayPoolImages(picks) {
  humanPick = masterHash["index_to_name"][picks[0]];
  humanPickCMC = masterHash["name_to_cmc"][humanPick];
  humanPickURL = masterHash["name_to_url"][humanPick][masterHash["name_to_url"][humanPick].length - 1];
  if (humanPickCMC < 1) {
      activePoolUrls[0].push(humanPickURL);
  }
  else if (humanPickCMC < 7) {
    activePoolUrls[humanPickCMC - 1].push(humanPickURL);
  }
  else {
    activePoolUrls[5].push(humanPickURL);
  }
  for (j = 0; j < 6; j++) {
      for (i = 0; i < activePoolUrls[j].length; i++) {
        poolArray[j][i].src = activePoolUrls[j][i];
      }
  }
}

function displayPoolAfterSideboard() {
  clicked = this.id
  pile = clicked[0]
  index = parseInt(clicked.slice(2, 4)) //note that index is one above the index used in array
  console.log("index", index)
  console.log(activePoolUrls[pile - 1].length, "length precut");
  cutURL = activePoolUrls[pile - 1].splice((index - 1), 1);
  console.log(cutURL);
  poolSideboard[pile - 1].push(cutURL[0])
  for (k = 0; k < 15; k++) {
    poolArray[pile - 1][k].src = ""
  }
  console.log(activePoolUrls[pile - 1].length);
  for (z = 0; z < activePoolUrls[pile - 1].length; z++) {
    poolArray[pile - 1][z].src = activePoolUrls[pile - 1][z]
  }
}

function displayPoolAfterReset() {
  for (i = 0; i < 6; i++) {
    for (j = 0; j < poolSideboard[i].length; j++) {
      activePoolUrls[i].push(poolSideboard[i][j]);
    }
  }
  for (k = 0; k < 6; k++) {
    for (l = 0; l < activePoolUrls[k].length; l++) {
      poolArray[k][l].src = activePoolUrls[k][l];
    }
  }
  poolSideboard = [[], [], [], [], [], []]
}

function displayFeedbackToggle() {
  console.log("toggled visability")
  if (feedbackActive === true) {
    feedbackHTML.style.visibility = "hidden";
    scoreHTML.style.visibility = "hidden";
    feedbackActive = false;
    return
  }
  if (feedbackActive === false) {
    console.log("turning back on")
    feedbackHTML.style.visibility = "visible";
    scoreHTML.style.visibility = "visible";
    feedbackActive = true;
    return
  }
}

///////////////////////////////// UPDATE LOGIC //////////////////////////////////

function generatePickAccuracy(activePickSoftmax, picks, preds) {
  let botPickSoftmax = activePickSoftmax[preds[0]];
  let humanPickSoftmax = activePickSoftmax[picks[0]];
  error = 1 - humanPickSoftmax / botPickSoftmax;
  pickValue = -Math.pow(error, 2.8) + 1;
  score += pickValue;
  scoreFixed = score.toFixed(1);
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

//Creating index table for feature vectors
let feature_vector_index = {};
feature_vector_index["Colorless"] = 0;
feature_vector_index["W"] = 1;
feature_vector_index["U"] = 2;
feature_vector_index["B"] = 3;
feature_vector_index["R"] = 4;
feature_vector_index["G"] = 5;
feature_vector_index[0.0] = 6;
feature_vector_index[1.0] = 7;
feature_vector_index[2.0] = 8;
feature_vector_index[3.0] = 9;
feature_vector_index[4.0] = 10;
feature_vector_index[5.0] = 11;
feature_vector_index[6.0] = 12;
feature_vector_index[7.0] = 13;

// Function that updates feature vectors
function updateFeatureVectors(picks, featureVectors = activeFeatureVectors) {
  for (i = 0; i < 8; i++) {
    predName = masterHash["index_to_name"][picks[i]];
    predColor = masterHash["name_to_color"][predName];
    predCMC = masterHash["name_to_cmc"][predName];
    // console.log("feature vector update:", predName, predColor, predCMC, "player:", i);
    if (predColor.length === 0) {
      featureVectors[i][feature_vector_index["Colorless"]] += 1;
    } else {
      for (m = 0; m < predColor.length; m++) {
        featureVectors[i][feature_vector_index[predColor[m]]] += (1 / predColor.length)
      }
    }
    if (predCMC > 7) {
      featureVectors[i][feature_vector_index[7.0]] += 1;
    } else {
      featureVectors[i][feature_vector_index[predCMC]] += 1;
    }
  }
  return featureVectors;
}

// Function that adds the prediction to the pool of all 7 non human players
function updatePools(picks, arrayOfPools) {
  for (i = 0; i < 8; i++) {
    arrayOfPools[i][picks[i]] += 1;
  }
}

function updatePacks(
  count = currentPick,
  draftPack = activePacks,
  picks = activePicks
) {
  pack = Math.floor(currentPick / 15)
  console.log("pack before pick", pack)
  arrayOfActivePacks = [];
  if (count !== 15 && count !== 30) {
    for (i = 0; i < 8; i++) {
      draftPack[i][pack][picks[i]] = 0;
      arrayOfActivePacks.push(draftPack[i][pack]);
    }
    if (currentPack !== 1) {
      console.log("poping last, unshifting")
      last = arrayOfActivePacks.pop();
      arrayOfActivePacks.unshift(last);
      for (j = 0; j < 8; j++) {
        activePacks[j][pack] = arrayOfActivePacks[j];
      }
    } else {
      console.log("shifting first, pushing")
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
function updateOnehots(packs, features, pools, packnum) {
  let activeOnehotsTemp = []
  for (i = 0; i < 8; i++) {
    let playersOnehot = [];
    let playerOnehotTemp = playersOnehot.concat(pools[i], packs[i][packnum], features[i]);
    activeOnehotsTemp.push(playerOnehotTemp);
  }
  return activeOnehotsTemp;
}

function updatePick() {
  currentPick++
  currentPack = Math.floor((currentPick) / 15)
}

function updateDraftIfOver() {
  if (currentPick === 45) {
    console.log("triggered");
    for (i = 0; i < displayPack.length; i++) {
      displayedPack[i].src = ""
    }
    restartText.style.display = "block"
    restartIcon.style.display = "block"
    restartText.addEventListener("click", resetDraft)
    restartIcon.addEventListener("click", resetDraft);
  }
  draftOver = true
}

function updatePoolToggled() {
  
  if (poolToggled === false) {
    poolToggled = true
    restartIcon.style.display = "none"
    restartText.style.display = "none"
  } else {
    poolToggled = false;
    if (draftOver === true) {
      restartIcon.style.display = "block";
      restartText.style.display = "block";
    }
  }
}

///////////////////////////////// UPDATEFUNCS //////////////////////////////////

function humanMakesPick() {
  // Changing border color of the card the player picked
  if (picksActive === true) {
    for (i = 0; i < 15; i++) {
      displayedPack[i].removeEventListener("click", humanMakesPick);
    }
    picksActive = false;
    pickSRC = this.src;
    for (i = 0; i < displayedPack.length; i++) {
      if (displayedPack[i].src === pickSRC) {
        displayedPack[i].style.border = "thick solid #ff9966";
      }
    }
    // Highlighting bot pick and calculating accuracy of human pick
    pickName = masterHash["url_to_name"][pickSRC];
    pickIndex = masterHash["name_to_index"][pickName];

    activePicks = JSON.parse(JSON.stringify(activePreds)); //this creates a deepcopy, because JS using shallowcopy for arrays
    activePicks[0] = pickIndex;

    displayBotPred(activePreds[0]);
    generatePickAccuracy(activePickSoftmax, activePicks, activePreds);

    // Updating event listeners
    setTimeout(() => {
      for (i = 0; i < 15; i++) {
        displayedPack[i].addEventListener("click", humanSeesResults);
      }
    }, 100);

    // Updating pools, feature vectors, and packs
  }
}

function humanSeesResults() {
  if (picksActive === false) {
    for (i = 0; i < 15; i++) {
      displayedPack[i].removeEventListener("click", humanSeesResults);
    }
    updatePick();
    if (currentPick < 45) {
      console.log(currentPick)
      updatePools(activePicks, activePools);
      activeFeatureVectors = updateFeatureVectors(activePicks, activeFeatureVectors);
      activePacks = updatePacks(currentPick, activePacks, activePicks);
      packnumb = Math.floor(currentPick/15)
      for (f = 0; f < 8; f++) {
        sum = findSum(activePacks[f][packnumb]);
        console.log(sum);
      }
      activeOnehots = updateOnehots(activePacks, activeFeatureVectors, activePools, currentPack);
      activePreds = makeBatchPreds(activeOnehots);
      displayPack(activeOnehots[0]);
      picksActive = true;
      displayPoolImages(activePicks);
      setTimeout(() => {
        for (i = 0; i < 15; i++) {
          displayedPack[i].addEventListener("click", humanMakesPick);
        }
      }, 100);
      feedbackHTML.innerHTML = ""
    } else {
      updateDraftIfOver();  
    }
  }
}

////////////////////////////////// END DRAFT ////////////////////////////////////

function resetDraft() {
  // resetting all varaiables that store gamestate
  score = 0;
  currentPick = 0;
  currentPack = 0;
  picksActive = false;
  feedbackActive = true;
  activePacks = []; 
  activeOnehots = [];
  activePreds = []
  activePicks = [];
  activeFeatureVectors = generateActiveFeatures();
  activePools = generateActivePools();
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
  restartIcon.style.display = "none"
  restartText.style.display = "none";
  draftOver = false

  // generating new packs and startingone onehots and preds
  let [commons, uncommons, rares, mythics, snowLands] = generateRarityArrays();
  activePacks = generateActivePacks();
  activeOnehots = updateOnehots(activePacks, activeFeatureVectors, activePools, currentPack);
  displayPack(activeOnehots[0]);
  console.log(activeOnehots);
  activePreds = makeBatchPreds(activeOnehots);
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
  feedbackHTML.innerHTML = ""
}

////////////////////////////////// IMPORT ////////////////////////////////////

Promise.all([
  tf.loadLayersModel("./draft_sim_website/tfjs_4/model.json"),
  fetch("./draft_sim_website/data/output_dict.txt"),
  fetch("./draft_sim_website/data/output_master_hash.txt"),
])
  .then(function (responses) {
    // Get a JSON object from each of the responses
    model = responses[0];
    json_response = responses.slice(1 - 3).map(function (response) {
      return response.json();
    });
    return Promise.all([model, json_response[0], json_response[1]]);
  })
  .then(function (data) {
    ///////////////////////////////// SETUP //////////////////////////////////
    masterHash = data[2];
    savedOutput = data[1];
    model = data[0];
    let [commons, uncommons, rares, mythics, snowLands] = generateRarityArrays();
    activePacks = generateActivePacks();
    activeOnehots = updateOnehots(activePacks, activeFeatureVectors, activePools, currentPack);
    loadingText.style.display = "none";
    loadingSpinner.style.display = "none";
    displayPack(activeOnehots[0]);
    activePreds = makeBatchPreds(activeOnehots);
    picksActive = true;

    for (h = 0; h < 8; h++) {
      for (w = 0;w < 3; w++) {
        sum = findSum(activePacks[h][w])
        console.log(sum)
      }
    }
  })
  .catch(function (error) {
    // if there's an error, log it
    console.log(error);
  });


////////////////////////////////// EVENT LISTENERS //////////////////////////////////// 

for (i = 0; i < 15; i++) {
  displayedPack[i].addEventListener("click", humanMakesPick);
}

for (j = 0; j < poolArray.length; j++){
  for (i = 0; i < poolArray[j].length; i++) {
    poolArray[j][i].addEventListener("click", displayPoolAfterSideboard)
  }
}
resetSideboardButton.addEventListener("click", displayPoolAfterReset);
toggleFeedbackButton.addEventListener("click", displayFeedbackToggle);
resetDraftButton.addEventListener("click", resetDraft)
poolToggle.addEventListener("click", updatePoolToggled)

