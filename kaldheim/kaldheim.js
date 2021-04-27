"use strict";
///////////////////////////////// TO TEST, RUN ON LOCAL SERVER //////////////////////////////////
// py -m http.server
// http://localhost:8000/path

///////////////////////////////// CREATE HTML WITH LOOP //////////////////////////////////
let KaldheimHTMLGeneration = new HTMLGeneration();

let mainWindow = document.getElementById("main_window");
KaldheimHTMLGeneration.createPackHTML(mainWindow);

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

KaldheimHTMLGeneration.createPoolHTML(elementPoolColArray);

///////////////////////////////// FETCHING PAGE ELEMENTS //////////////////////////////////
let elements = KaldheimHTMLGeneration.fetchElements()

//////////////////////////////// KALDHEIM UNIQUE VARIABLES //////////////////////////////

let landSlot = [
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

const setSize = 280;
const inputSize = 574;
const oddsRare = 0.875;
const MLPreds = true;
const genericPack = true;
const flipCards = false;


////////////////////////////////// IMPORT ////////////////////////////////////
let KaldheimDraftPackage = new DraftSimPackage("Kaldheim", setSize, inputSize, oddsRare, landSlot, elements, MLPreds, genericPack, flipCards);


Promise.all([
  tf.loadLayersModel("./tfjs_model/model.json"),
  fetch("./data/output_master_hash.txt"),
])
  .then(function (responses) {
    // Get a JSON object from each of the responses
    let model = responses[0];
    let json_response = responses.slice(1 - 2).map(function (response) {
      return response.json();
    });
    return Promise.all([model, json_response[0], json_response[1]]);
  })
  .then(function (data) {
    KaldheimDraftPackage.masterHash = data[1];
    KaldheimDraftPackage.model = data[0];
    if (data[2]) {
      KaldheimDraftPackage.ratings = data[2];
    }
    /////////////////////////////////// SETUP ////////////////////////////////////
  })
  .then(function (data) {
    KaldheimDraftPackage.setupAfterPromise(data);
  })
  .catch(function (error) {
    // if there's an error, log it
    console.log(error);
  });

////////////////////////////////// EVENT LISTENERS ////////////////////////////////////

KaldheimDraftPackage.elements["imageSizeSlider"].oninput = function () {
  for (let i = 0; i < KaldheimDraftPackage.elements["DisplayedPackDiv"].length; i++) {
    KaldheimDraftPackage.elements["DisplayedPackDiv"][
      i
    ].style.maxWidth = `${this.value}vh`;
  }
};