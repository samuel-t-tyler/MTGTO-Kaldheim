"use strict";
///////////////////////////////// TO TEST, RUN ON LOCAL SERVER //////////////////////////////////
// python -m http.server (in console)
// http://localhost:8000/path

///////////////////////////////// CREATE HTML WITH LOOP //////////////////////////////////
let StrixhavenHTMLGeneration = new HTMLGeneration();

let mainWindow = document.getElementById("main_window");
StrixhavenHTMLGeneration.createPackHTML(mainWindow);

//Element naming convention not used because these variables are not directly reference anywhere, accessed though elemenetPoolColArray
let poolZeroCmcCol = document.getElementById("zero_cmc");
let poolOneCmcCol = document.getElementById("one_cmc");
let poolTwoCmcCol = document.getElementById("two_cmc");
let poolThreeCmcCol = document.getElementById("three_cmc");
let poolFourCmcCol = document.getElementById("four_cmc");
let poolFiveCmcCol = document.getElementById("five_cmc");
let poolSixCmcCol = document.getElementById("six_cmc");
let poolSideboardCol = document.getElementById("sideboard");

let elementPoolColArray = [poolZeroCmcCol, poolOneCmcCol, poolTwoCmcCol, poolThreeCmcCol, poolFourCmcCol, poolFiveCmcCol, poolSixCmcCol, poolSideboardCol];

StrixhavenHTMLGeneration.createPoolHTML(elementPoolColArray);

///////////////////////////////// FETCHING PAGE ELEMENTS //////////////////////////////////
let elements = StrixhavenHTMLGeneration.fetchElements()

//////////////////////////////// SET UNIQUE VARIABLES //////////////////////////////

let specialSlot = ["Redefined in special generate pack function, unique pack setup for stx"];

const setSize = 338;
const inputSize = (setSize * 2) + 14;
const oddsRare = 0.875;
const MLpreds = false; // Once we have sufficient data for ML preds, we can set this to default to true
const genericPack = false
const flipCards = true

////////////////////////////////// IMPORT ////////////////////////////////////
let StrixhavenDraftPackage = new DraftSimPackage("Strixhaven", setSize, inputSize, oddsRare, specialSlot, elements, MLpreds, genericPack, flipCards);

Promise.all([
  tf.loadLayersModel("./tfjs_model/model.json"),
  fetch("./data/output_master_hash.txt"),
  fetch("./data/masterRatings.txt"),
])
  .then(function (responses) {
    // Get a JSON object from each of the responses
    let model = responses[0];
    let json_response = responses.slice(1 - 3).map(function (response) {
      return response.json();
    });
    return Promise.all([model, json_response[0], json_response[1]]);
  })
  .then(function (data) {
    StrixhavenDraftPackage.masterHash = data[1];
    StrixhavenDraftPackage.model = data[0];
    if (data[2]) {
      StrixhavenDraftPackage.ratings = data[2];
    }
    /////////////////////////////////// SETUP ////////////////////////////////////
  })
  .then(function (data) {
    StrixhavenDraftPackage.setupAfterPromise(data);
  })
  .catch(function (error) {
    // if there's an error, log it
    console.log(error);
  });


/////////////////////////////////////////// SPECIAL STRIXHAVEN FUNCTIONS ///////////////////////////////////////////////

StrixhavenDraftPackage.elements["imageSizeSlider"].oninput = function () {
  for (let i = 0; i < StrixhavenDraftPackage.elements["DisplayedPackDiv"].length; i++) {
    StrixhavenDraftPackage.elements["DisplayedPackDiv"][
      i
    ].style.maxWidth = `${this.value}vh`;
  }
};

function generatePackSpecial() {
  let activePackTemp;
  (activePackTemp = []).length = StrixhavenDraftPackage.setSize;
  activePackTemp.fill(0);
  let pack = [];
  let archiveChoice;
  let lessonChoice

  // Picking Random Archive
  let archiveUIndex = Math.floor(Math.random() * StrixhavenDraftPackage.masterHash["uncommon_archives"].length)
  let archiveRIndex = Math.floor(Math.random() * StrixhavenDraftPackage.masterHash["rare_archives"].length);
  let archiveMIndex = Math.floor(Math.random() * StrixhavenDraftPackage.masterHash["mythic_archives"].length);
  let archiveChocies = [
    StrixhavenDraftPackage.masterHash["uncommon_archives"][archiveUIndex],
    StrixhavenDraftPackage.masterHash["rare_archives"][archiveRIndex],
    StrixhavenDraftPackage.masterHash["mythic_archives"][archiveMIndex],
  ];
  let archiveRan = Math.random()
  if (archiveRan > 0.935) {  //Odds of mythic archive
    archiveChoice = archiveChocies[2]
  } else if (archiveRan < 0.935 && archiveRan > 0.66) { //Odds of rare archive
    archiveChoice = archiveChocies[1];
  } else { //Odds of uncommon archive
    archiveChoice = archiveChocies[0];
  }
  // Picking random Lesson
  let lessonCIndex = Math.floor(Math.random() * StrixhavenDraftPackage.masterHash["common_lessons"].length)
  let lessonUIndex = Math.floor(Math.random() * StrixhavenDraftPackage.masterHash["uncommon_lessons"].length)
  let lessonRIndex = Math.floor(Math.random() * StrixhavenDraftPackage.masterHash["rare_lessons"].length);
  let lessonMIndex = Math.floor(Math.random() * StrixhavenDraftPackage.masterHash["mythic_lessons"].length);
  let lessonChocies = [
    StrixhavenDraftPackage.masterHash["common_lessons"][lessonCIndex],
    StrixhavenDraftPackage.masterHash["uncommon_lessons"][lessonUIndex],
    StrixhavenDraftPackage.masterHash["rare_lessons"][lessonRIndex],
    StrixhavenDraftPackage.masterHash["mythic_lessons"][lessonMIndex],
  ];
  let lessonRan = Math.random();
  if (lessonRan > 0.935) {  //Odds of mythic archive
    lessonChoice = lessonChocies[3];
  } else if (lessonRan < 0.935 && lessonRan > 0.7) { //Odds of rare archive
    lessonChoice = lessonChocies[2];
  } else if (lessonRan < 0.7 && lessonRan > 0.5) {
    //Odds of uncommon archive
    lessonChoice = lessonChocies[1];
  } else {
    lessonChoice = lessonChocies[0];
  }


  let specialSlot = Object.keys(StrixhavenDraftPackage.masterHash["master_hash_archives"]["name_to_url"])
  const cards = [
    StrixhavenDraftPackage.masterHash["nl_commons"],
    StrixhavenDraftPackage.masterHash["nl_uncommons"],
    StrixhavenDraftPackage.masterHash["lessons"],
  ];
  const quantity = [9, 3, 1];

  // add commons, uncommons, mystical archive
  for (let i = 0; i < quantity.length; i++) {
    let shuffled = cards[i].sort(() => 0.5 - Math.random());
    // Get sub-array of first n elements after shuffled
    let selected = shuffled.slice(0, quantity[i]);
    for (let j = 0; j < quantity[i]; j++) {
      pack.push(selected[j]);
    }
  }
  // add rare/mythic
  let randomNum = Math.random();
  if (randomNum > StrixhavenDraftPackage.oddsOfRare) {
    let shuffled = StrixhavenDraftPackage.masterHash["nl_mythics"].sort(
      () => 0.5 - Math.random()
    );
    let selected = shuffled.slice(0, 1);
    pack.push(selected);
  } else {
    let shuffled = StrixhavenDraftPackage.masterHash["nl_rares"].sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, 1);
    pack.push(selected);
  }
  pack.push(archiveChoice)

  for (let card = 0; card < 15; card++) {
    activePackTemp[StrixhavenDraftPackage.masterHash["name_to_index"][pack[card]]] = 1;
  }
  return activePackTemp;
};