import Figma2IvxAbs from "./output/figma2ivxabs.mjs";
import walkPage from "./output/html-to-ivxabs-2.mjs";
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  let isResponseAsync = false;

  if (request.inject) {
    isResponseAsync = true;
    chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
      const activeTab = sender.tab || tabs[0];
      if (activeTab && activeTab.id) {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => { window.scrollTo(0, 0) }
        }).then(() => {
          setTimeout(() => {
            chrome.scripting.executeScript(
              {
                target: { tabId: activeTab.id },
                func: walkPage
              }
            ).then(injectionResults => {
              console.log("debug injectionResults", injectionResults)
              for (let index = 0; index < injectionResults.length; index++) {
                if (injectionResults[index] && injectionResults[index].result) {
                  console.log("debug injectionResults result", injectionResults[index].result)
                  const figmaJSON = injectionResults[index].result
                  let figma2ivxabs = new Figma2IvxAbs({ figmaNodes: figmaJSON.layerTree })
                  let result = figma2ivxabs.exec({ env: 'abs' })
                  let pageResult = result.stage.children[1]
                  console.log("debug result", result)
                  sendResponse({ done: true, result: result, pageResult: pageResult })
                }
              }
            })
          }, 500)

        })

      }
    });
  }

  return isResponseAsync;
});
