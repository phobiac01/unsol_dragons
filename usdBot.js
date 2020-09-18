var Twitter = require('twitter');
const delay = require('delay');
var fs = require("fs");
const download = require('image-downloader')
var allDragons = require('./dragonLists.json');

var client = new Twitter({
  consumer_key: 'ldMxGNyBfbfJOwf2Hr6dtvRph',
  consumer_secret: 'HIWoCB6oSWx0iZXhSpTeU5n6yylydNS8NMMt6nKKcQx0X2jein',
  access_token_key: '1255360103672356864-az6TwfeHjjMar2WPyIKCKflFroYqF1',
  access_token_secret: 'SFGd89KQ9Ft08gVhVgoiDWag6OOrOzIPkVJMl7GpprhA3'
});



var sentDragons = allDragons.sentDragons;
var verifiedDragons = allDragons.verifiedDragons;
var unverifiedDragons = allDragons.unverifiedDragons;
var deniedDragons = allDragons.deniedDragons;

const conversions = {
  "day" : 86400000,
  "hour" : 3600000,
  "minute" : 60000,
  "second" : 1000,
}
var currentDate = Date();
var currentHour;
var currentMinute;
var dragonTime1;
var dragonTime2;




initTimers();

async function initTimers() {
  await delay(5000);
  checkTimers();
}

function checkTimers() {
  currentDate = new Date();
  currentHour = currentDate.getHours();
  currentMinute = currentDate.getMinutes();

  // If its a new day, generate two new dragon times thorughout the day
  if (currentHour == 0 && currentMinute == 0) 
    getDragonTimes(currentDate);

  // If its dragon time, start sending a dragon
  if (currentDate >= dragonTime1 || currentDate >= dragonTime2)
    sendFreshDragon();
  
  console.log('(checked the timers) ' + currentDate.toString());
}





function getDragonTimes(date) {
  // Add in a randomizer later
  dragonTime1 = Date(date.now() + 4000);// 480000); // Fire once at 8am
  dragonTime1 = Date(date.now() + 8000);// 960000); // Fire again at 4pm
}

async function sendFreshDragon() {
  var selectedDragon = await getNewDragonImage();
  var uploadPath = await downloadImage(selectedDragon.url, selectedDragon.file_name);
  var twitterMediaId = await uploadMedia(uploadPath);

  // Populate tweet parameters
  var tweetObj = {
    "status" : "Dragon number #" + (sentDragons.length + 1) + "\n" + selectedDragon.url,
    "media_ids" : twitterMediaId,
  }
  var tweetResponse = await sendTweet(tweetObj);


  // Append success message and completion diagnostics to image number
  if (tweetResponse.status == 200) {
    console.log('] Successfully sent a Fresh Dragon into the world!');
    //sentDragons.push();
  }
}

async function sendCachedDragon() {
  if (verifiedDragons.length > 0) {
    var uploadPath = await downloadImage(verifiedDragons[0].url, verifiedDragons[0].image_name);
    var twitterMediaId = await uploadMedia(uploadPath);

    // Populate tweet parameters
    var tweetObj = {
      "status" : "Dragon number #" + (sentDragons.length + 1) + "\n" + selectedDragon.url,
      "media_ids" : twitterMediaId,
    }
    var tweetResponse = await sendTweet(tweetObj);
  
  
    // Append success message and completion diagnostics to image number
    if (tweetResponse.status == 200) {
      console.log('] Successfully sent a Fresh Dragon into the world!');
      // verifiedDragons.shift();
      // sentDragons.push();
    }

  } else {
    console.warn('!!!] Tried to send a verified dragon but none exist...\n Nothing was sent.');
  }
}


// Function to parse through api response and single out a usable dragon
// If new dragon cant be found, repeat api request on next page
// and mark that page as 'DRY'
async function getNewDragonImage() {
  var selectedDragon = null;
  var searchedBatchCount = 0;

  while (searchedBatchCount <= 10 && selectedDragon == null) {
    searchedBatchCount++;

    // Use google api to grab a list of random images
    var apiResponse = await googleApiRequest(searchedBatchCount);

    // Check over api response list to find a single viable dragon image
    for (var i = 0; i < apiResponse.data.length; i++) {
      var apiResUrl = apiResponse.data[i].url;
      var imageNameStartIndex = apiResUrl.lastIndexOf('/');
      var imageNameEndIndex = apiResUrl.length;
      var apiImageType = 'NA';

      // Determine the type of image and truncate the URL if theres any queries after filetype
      if (apiImageName.includes('.png')) {
        imageNameEndIndex = indexOf('.png') + 4;
        apiImageType = 'png';

      } else if (apiImageName.includes('.jpg')) {
        imageNameEndIndex = indexOf('.jpg') + 4;
        apiImageType = 'jpg';

      } else if (apiImageName.includes('.jpeg')) {
        imageNameEndIndex = indexOf('.jpeg') + 5;
        apiImageType = 'jpeg';
      }

      // Extract the image name from the URL
      var apiImageName = apiResUrl.substring(imageNameStartIndex, imageNameEndIndex + 1);

      console.log(apiResUrl);
      console.log(imageNameStartIndex);
      console.log(imageNameEndIndex);
      console.log(apiImageName);
      console.log(apiImageType);
      console.log('\n\n');

      var alreadyExists = false;

      // Check for matches in sentDragons
      for (var x = 0; x < sentDragons.length; x++) {
        if (apiImageName == sentDragons[x].image_name) {
          alreadyExists = true;
          break;
        }
      }

      if (!alreadyExists) {
        // Check for matches in unverifiedDragons
        for (var x = 0; x < unverifiedDragons.length; x++) {
          if (apiImageName == unverifiedDragons[x].image_name) {
            alreadyExists = true;
            break;
          }
        }
        
        if (!alreadyExists) {
          // Check for matches in verifiedDragons
          for (var x = 0; x < verifiedDragons.length; x++) {
            if (apiImageName == verifiedDragons[x].image_name) {
              alreadyExists = true;
              break;
            }
          }

          if (!alreadyExists) {
            // Check for matches in deniedDragons
            for (var x = 0; x < deniedDragons.length; x++) {
              if (apiImageName == deniedDragons[x].image_name) {
                alreadyExists = true;
                break;
              }
            }
          }
        }
      } 

      // If the image passes all tests and truly hasnt been used yet, set image data and return
      if (!alreadyExists) {
        selectedDragon = {
          "file_name" : apiImageName,
          "url" : apiResUrl,
          "format" : apiImageType,
        };

        console.log('New dragon found!\n' + selectedDragon);
        break;

      } else {
        console.log('Image already exists, moving to next result >>>');
        selectedDragon = null;

      }
    } // End individual image validation loop for this api batch
  } // End batch validation for api page

  return selectedDragon;
}

async function googleApiRequest(pageNumber) {
  var apiResponse = await ''; // Api GET request from google

  return apiResponse;
}








async function downloadImage(imageUrl, imageName) {
  var path = '/home/bluedev/bots/unsolicitedDragons/imageAssets/';

  const options = {
    url: imageUrl,
    dest: path + imageName,
  }
   
  download.image(options)
    .then(({ filename }) => {
      console.log('Saved image to: ', filename);  // saved to /path/to/dest/image.jpg
    })
    .catch((err) => console.error(err))

  // Append file location for image number
  return path + imageName;
}

async function uploadMedia(imagePath) {
  var tweetMediaId = null;
  var promisee = new Promise();

  var selectedImage;

  fs.readFile(imagePath, function(err, data) {
    if (err) throw err;

    selectedImage = new Buffer(data, 'binary');
  });

  var tweetObj = {
    media : selectedImage,
  };

  client.post('media/upload', tweetObj, (error, response) => {
    if (!error) {
      tweetMediaId = response.media_id;
      console.log(currentDate.toString() + ' >> image uploaded successfully');

    } else 
      console.warn(error);
    
    promisee.resolve();
  });

  return tweetMediaId;
}

// Send the tweet with appended image and return the response from Twitter API
async function sendTweet(tweetObj) {
  var tweetResponse = null;
  var promisee = new Promise();

  client.post('statuses/update', tweetObj, (error, response) => {
    if (!error) {
      tweetResponse = response;
      console.log(currentDate.toString() + ' >> dragon sent successfully');

    } else 
      console.warn(error);
    
    promisee.resolve();
  });

  await promisee;
  return tweetResponse;
}




// Modifyer functions for json file and json in cache

function addSaved() {
  
}
function removeSaved(entry_id) {
  
}


function addVerified() {
  
}
function removeVerified(entry_id) {
  
}


function addUnverified() {
  
}
function removeUnverified(entry_id) {
  
}


function addDenied() {
  
}
function removeDenied(entry_id) {
  
}


// Main bot flow, relies on strong search parameters for good image results
/*Bot Flow:
  > generate 2 random times throughout the day (within parameters)
  > create check loop to check if time >= DragonTime1 || DragonTime2
    > If its the next day run the dragonTime generation again

  > when time comes, ask google for dragon images
  > choose a random index number and pull dragon info from that
  > save info to cache and download image from URL
  > Upload the image to twitters media API
  > Upload new image URI and append source informtaion and title to tweet
  > Log information and status of tweet
  > wait for next DragonTime event
*/

// Alternate flow for curated dragon content by trusted mod group
/*Alternate Bot Flow:
  > watch for a DM that says 'real dragon hours'
  > If DM recieved, send search request to API
  > create an Unverified list item of 20 images (exclude already verified, deniedImages, and sent image paths)
  > send one and wait for reply of 'y' or 'n'
    > If 'Y' add image to verified list and remove from unverified
    > If 'N' add image to deniedImages list and remove from unverified
  > loop through all images in unverified list then display 'DONE' message
*/





// client.get('direct_messages/events/list', (err, tweet, response) => {
//     console.log(response.body); // Need to find a way to sort through all these messages

//     if (err) console.log(err);
// });