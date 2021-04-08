kaldheimBackground = document.getElementById("kaldheim-background");
kaldheimLink = document.getElementById("kaldheim");
strixhavenBackground = document.getElementById("strixhaven-background");
strixhavenLink = document.getElementById("strixhaven");

console.log(kaldheimLink);
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


