kaldheimBackground = document.getElementById("kaldheim-background");
kaldheimLink = document.getElementById("kaldheim");
strixhavenBackground = document.getElementById("strixhaven-background");
strixhavenLink = document.getElementById("strixhaven");
aboutLink = document.getElementById("about")
closeButton = document.getElementById("close-button")
mainDiv = document.getElementById("main-div")

aboutLink.addEventListener("click", function () {
  mainDiv.style.visibility = "visible"
  mainDiv.style.opacity = 1
})

kaldheimLink.addEventListener("mouseenter", function () {
  kaldheimBackground.style.opacity = "30%"
})

kaldheimLink.addEventListener("mouseleave", function () {
  kaldheimBackground.style.opacity = "0%";
});

strixhavenLink.addEventListener("mouseenter", function () {
  strixhavenBackground.style.opacity = "30%";
});

strixhavenLink.addEventListener("mouseleave", function () {
  strixhavenBackground.style.opacity = "0%";
});

closeButton.addEventListener("click", function () {
  mainDiv.style.visibility = "hidden";
  mainDiv.style.opacity = 0;
})


