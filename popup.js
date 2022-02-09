// Initialize button with user's preferred color
let changeColor = document.getElementById("changeColor");

chrome.storage.sync.get("color", ({ color }) => {
  changeColor.style.backgroundColor = color;
});


var nodes;



// The body of this function will be executed as a content script inside the
// current page
function setPageBackgroundColor()  {

  function process_text_old(dictionary, text) {
    var words = text.split(' ');
    var output = '';
    for(var i=0;i<words.length;i++){
      if (words[i].replace(/\s/g, "") != '')
        output += '(' + words[i] + ')' + ' ';
    }
    return output;
  }

  function process_text(dictionary, text, version) {
    // go through text and replace if needed
    var output = '';
    for(var i=0;i<text.length;i++){
      if(version == 0) {
        if(dictionary.has(text[i])) {
          output += text[i] + '(' + dictionary.get(text[i]) + ')';
        } else {
          output += text[i];
        }
      } else if(version == 1) {
        if(dictionary.has(text[i])) {
          var zh = text[i];
          var py = dictionary.get(zh);
          var pinyinified = pinyinify(py);
          output += '<div class="ann">';
          console.log('pinyin ' + py + ' pinify ' + pinyinify(py));
          output += '<div class="py">' + pinyinified + '</div>';
          output += '<div class="zh">' + zh + '</div>';
          output += '</div>';
        } else {
          //output += text[i];
          var original = text[i];
          original = original.replace(' ', '&nbsp;');
          output += '<div class="annThin">';
          output += '<div class="py">' + '&nbsp;' + '</div>';
          output += '<div class="zh">' + text[i] + '</div>';
          output += '</div>';
        }
      }
    }
    return output;
  }

  function annotate_node(node, dictionary) {
    if(node.nodeType != 3) { // not text 
      console.log('ignoring node');
      console.log(node);
      return;
    }

    console.log(node);
    var original_text = $(node).text();
    console.log('original text ' + original_text);
    var replacement_nodes = [];

    for(var i=0; i<original_text.length; i++) {
      var zh = original_text[i];
      var pinyinified = '&nbsp;';
      if(dictionary.has(original_text[i])) {
        var ann = $('<div>');
        var py = dictionary.get(zh);
        var pinyinified = pinyinify(py);
        ann.addClass('ann');
        var py_div = $('<div>').addClass('py').html(pinyinified);
        var zh_div = $('<div>').addClass('zh').html(zh);
        ann.append(py_div);
        ann.append(zh_div);
        replacement_nodes.push(ann);
      } else {
        //ann.addClass('annThin');
        var textNode = document.createTextNode(zh);
        replacement_nodes.push(textNode);
      }

    }
    console.log('replacing');
    console.log(replacement_nodes);
    $(node).replaceWith(replacement_nodes);
  }

  var r = 'default';

  function load_dictionary() {
    // Load url
    const url = chrome.runtime.getURL('dictionaries/hanzi2pinyin.txt');
    console.log('loading dictionary form url ' + url)

    return new Promise(function(resolve, reject){
        fetch(url)
        .then(function(response) {
          return response.text();
        }).then(function(text){
          console.log('loaded '+text.length + ' bytes');
          //console.log(text);

          var dictionary = new Map();
          var lines = text.split(/\r?\n/);
          console.log('Got lines: ' + lines.length);
          for(var i=0;i<lines.length;i++){
            var tokens = lines[i].split(' ');
            if(tokens.length>=2){
              dictionary.set(tokens[0], tokens[1]);
              console.log('registering character: ' + lines[i]);
            } else {
              console.log('skipping line: ' + lines[i]);
            }
          }
          resolve(dictionary);
        });
    });
  }

  chrome.storage.sync.get("color", ({ color }) => {
    //document.body.style.backgroundColor = color;
    //$('body').css('background-color','red');

    load_dictionary().then(function(dictionary){
      console.log(dictionary);
      console.log('Got dictionary of size ' + dictionary.length);

      /*
      nodes = $('body')
      .contents()
      .filter(function() {
        return this.nodeType === 3; //Node.TEXT_NODE
      })
      .css('background-color', 'blue');//.css('background-color', 'blue');
      */

      // Replacing text is dangerous, it could remove children tags
      var translate_tags = 'span,p,h1,h2,h3,h4,h5,a,li,button';
  
      //mandarinspot.annotate(window.body, {phonetic: 'pinyin', inline: true});
      // Try to replace text
      //$(translate_tags).text('xxxx');
  
      /* V2
      $(translate_tags).each(function(){
        var original_text = $(this).text();
        var processed_text = process_text(dictionary, original_text, 1);
        $(this).html(processed_text);
      })
      */

      $(translate_tags).contents().each(function() {
        if (this.nodeType == 3) {
          var original_text = this.nodeValue;
          console.log('Calling annotate_node on ');
          console.log(this);
          annotate_node(this, dictionary);
        }
    });
      
    });



  });
}
  
/* Fast debug, inject this into console
var jq = document.createElement('script');
jq.src = "https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js";
document.getElementsByTagName('head')[0].appendChild(jq);
// ... give time for script to load, then type (or see below for non wait option)
jQuery.noConflict();
*/


// When the button is clicked, inject setPageBackgroundColor into current page
changeColor.addEventListener("click", async () => {
  console.log('Clicked on button');

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: setPageBackgroundColor,
  });
});