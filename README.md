# MTGTO-Kaldheim

### Website Hosted here:
  https://mtgto-kaldheim.web.app/
  
### Homepage:
  https://mtgto-bot.web.app/

Particles.js available here:
https://github.com/VincentGarreau/particles.js/

Two functions, "humanMakesPick" and "humanSeesResults" guide the logic of the site.  We start with "humanMakesPick", 
and alternate back and forth between the two for the remainder of the draft.  Most of the other functions called here 
are callback functons within these two.  There is also a "setupAfterPromise" function that is called once the promise all 
resolves that prepares the site for the first pick by generating packs.

masterHash:
  masterHash is a layered object that is critical to the function the the site and errorproofing.  It takes a representation of
  a card using a datatype and converts it into a different representation of that card.  For example, masterHash["name_to_url"][name]
  takes a card name, and spits out the URL we use for the image.  the available datatypes are "name", "url", and "index".  Index
  is the index of the onehot vector coding for the card used in machine learning.  masterHash can also take name and spit out the card
  color, cmc, and rarity.  Examples:
    masterHash["index_to_name"][232]
    masterHash["url_to_index"][someurl]
    masterHash["name_to_color"][somename]

I created groups for the functions:
  Create HTML:  Loops to create HTML for the pack and pools.  See index.HTML for where this HTML is generated
  Helper Functions:   Helper functions are not actually used in the logic of the site, but can be used to errorproof.
  Generate:  Used to create variables or data used in the background
  Display:  Functions that change what is visible on the screen.
  Update:  Functions that updata data in the background
  End Draft:  A single function called resetDraft that resets the samestate and prepares a new game
  Main Logic:  The three functions that do most of the heavy lifting and contain a lot of sub-functions

I also created a few naming conventions:
  current - means the variable stores information about global gamestate.  Examples:  currentPack, currentPick
  active - means the variable stores information about players.  Examples: activePacks, activeOnehots (player's active packs+onehots)
  element - DOM element from document
