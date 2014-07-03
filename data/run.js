
function makeXHTMLelement(elem) {
  return $(document.createElementNS("http://www.w3.org/1999/xhtml",elem))
}

function requestContent() {
  self.port.emit("recommend");
}

self.port.on("style", function(file) {
  let link = document.createElementNS('http://www.w3.org/1999/xhtml',"link");
  link.setAttribute("href", file);
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  document.documentElement.appendChild(link);
});

let sideBar = $("#sidebar");
let tabGrid = $("#newtab-grid");
let sideMargin = $(".newtab-side-margin");
sideBar = $("<div>").
          attr("id","sidebar").
          css({"display": "-moz-box"}).
          addClass("linkGrid");

tabGrid.parent().append( sideBar );
let controlButton;

self.port.on("show", function(stories, options = {}) {
  if (!controlButton) {
    controlButton = makeXHTMLelement("img").
                      attr("id", "news-show").
                      addClass("maxButton").click(function () {
                        self.port.emit("maximize");
                    });
    $("#newtab-toggle").parent().append(controlButton);
  }

  sideBar.empty();
  if (options.hide) {
    controlButton.attr("src", dataUrl + "add.png").attr("title","Show News").click(function () {
      self.port.emit("maximize");
    });
  }
  else {
    controlButton.attr("src", dataUrl + "fileclose.png").attr("title","Hide News").click(function () {
      self.port.emit("minimize");
    });
  }

  if (!stories || stories.length == 0 || options.hide) return;
  let ul = makeXHTMLelement("ul").addClass("linkList");
  ul.append(
    makeXHTMLelement("button").text("Hide").addClass("minButton").click(function () {
      self.port.emit("minimize");
    }
  ));
  ul.append(
    makeXHTMLelement("button").text("Reload").addClass("reloadButton").click(function () {
      self.port.emit("reload");
    }
  ));
  ul.append(
    makeXHTMLelement("button").text("More News >>").addClass("moreButton").click(function () {
      //window.open("about:news");
      alert("work in progress");
    }
  ));
  
  sideBar.append(ul);
  for( let i in stories) {
    story = stories[i];
    let itemNode = makeXHTMLelement("li").addClass("linkItem");
    let imgSpan = makeXHTMLelement("img").attr("src", "http://" + story.domain + "/favicon.ico").addClass("linkImage");

    let linkSpan = makeXHTMLelement("span").addClass("linkSpan").append(
                      makeXHTMLelement("a").attr("href", story.url).attr("title",story.content).text(story.content).addClass("linkRef"));

    linkSpan.append("<div class='linkSite'>" + story.domain + "</div>");
    itemNode.append(imgSpan);
    itemNode.append(linkSpan);
    ul.append(itemNode);
  }
});

sideBar.scroll(function (event) {
  let jnode = $(event.target);
  //dump(event.target.scrollTop + " " + event.target.scrollHeight + " " + event.target.clientHeight + " " + jnode.innerHeight() + "\n");
});

requestContent();

