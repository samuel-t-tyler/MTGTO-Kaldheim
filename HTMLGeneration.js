"use strict";

class HTMLGeneration {
  ///////////////////////////////// CREATING HTML //////////////////////////////////
  // This html is the image elements and divs for the 15 cards that make up the pack shown the player each pick
  createPackHTML(main) {
    for (let i = 0; i < 15; i++) {
      let imageDiv = document.createElement("div");
      let imageElement = document.createElement("img");
      imageDiv.className = "pack-card-image-div";
      imageElement.className = "pack-card-image rounded noSelect zoom";
      imageElement.id = `pack-image-${i}`;
      imageDiv.appendChild(imageElement);
      main.appendChild(imageDiv);
    }
  }
  // HTML used to create image and div elements for the pool window
  createPoolHTML(colsArray) {
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 30; i++) {
        //Note i starts at one
        let imageDiv = document.createElement("div");
        let imageElement = document.createElement("img");
        let breakDiv = document.createElement("div");
        breakDiv.className = "w-100";
        imageDiv.className = "col pool-row";
        imageElement.className = `pool-card-image noSelect ${j}-cmc-image lift`;

        if (i < 9) {
          imageElement.id = `${j}-0${i + 1}`;
        } else {
          imageElement.id = `${j}-${i + 1}`;
        }
        imageDiv.appendChild(imageElement);
        colsArray[j].appendChild(imageDiv);
        colsArray[j].appendChild(breakDiv);
      }
    }
  }
  fetchElements() {
    let elements = {};

    elements["DisplayedPack"] = document.getElementsByClassName(
      "pack-card-image"
    );
    elements["DisplayedPackDiv"] = document.getElementsByClassName("pack-card-image-div");

    elements["FeedbackHTML"] = document.getElementById("feedback");
    elements["LoadingSpinner"] = document.getElementById("loadingSpinner");
    elements["RestartIcon"] = document.getElementById("restartIcon");
    elements["PoolToggle"] = document.getElementById("pool-toggler");

    elements["ResetPool"] = document.getElementById("resetSideboard");
    elements["ToggleFeedback"] = document.getElementById("toggleFeedback");
    elements["Restart"] = document.getElementById("resetDraft");

    elements["packCountHTML"] = document.getElementById("packCountHTML");
    elements["deckCountHTML"] = document.getElementById("deckCountHTML");
    elements["creatureCountHTML"] = document.getElementById(
      "creatureCountHTML"
    );
    elements["spellCountHTML"] = document.getElementById("spellCountHTML");
    elements["landCountHTML"] = document.getElementById("landCountHTML");
    elements["accuracyCountHTML"] = document.getElementById("accuracyCountHTML");
    elements["imageSizeSlider"] = document.getElementById("myRange");
    elements["questionMark"] = document.getElementById("question-mark")

    //Element naming convention not used because these variables are not directly reference anywhere, accessed though elemenetPoolArray
    let poolZeroCmc = document.getElementsByClassName("0-cmc-image");
    let poolOneCmc = document.getElementsByClassName("1-cmc-image");
    let poolTwoCmc = document.getElementsByClassName("2-cmc-image");
    let poolThreeCmc = document.getElementsByClassName("3-cmc-image");
    let poolFourCmc = document.getElementsByClassName("4-cmc-image");
    let poolFiveCmc = document.getElementsByClassName("5-cmc-image");
    let poolSixCmc = document.getElementsByClassName("6-cmc-image");

    elements["PoolArray"] = [
      poolZeroCmc,
      poolOneCmc,
      poolTwoCmc,
      poolThreeCmc,
      poolFourCmc,
      poolFiveCmc,
      poolSixCmc,
    ];
    elements["SideboardArray"] = document.getElementsByClassName("7-cmc-image");

    return elements
  }
}