
function makeXHTMLelement(elem) {
  return $(document.createElementNS("http://www.w3.org/1999/xhtml",elem))
}

function requestContent() {
  self.port.emit("recomend");
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

self.port.on("show", function(stories) {
  if (!stories || stories.length == 0) return;
  let ul = makeXHTMLelement("ul").addClass("linkList").append(
    makeXHTMLelement("button").text("Read More News >>").click(function () {
      //window.open("about:news");
      alert("work in progress");
    }
  ));
  sideBar.empty();
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

