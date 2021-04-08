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
}