setTimeout(() => {
    document.querySelector("#btn").addEventListener("click", () => {
        if (window.loading) {
            return
        }
        console.log("click btn")
        window.loading = true
        chrome.runtime.sendMessage({ inject: true }, response => {
            window.loading = false;
            console.log("get response", response)
            if (response.done && response.result) {
                // var json = JSON.stringify(response.result);
                // var blob = new Blob([json], {
                //     type: "application/json",
                // });

                // const link = document.createElement("a");
                // link.setAttribute("href", URL.createObjectURL(blob));
                // link.setAttribute("download", "page.ivx.json");
                // document.body.appendChild(link);

                // link.click();
                // document.body.removeChild(link);

                var page_json = JSON.stringify({nodes:response.pageResult,type:"web"});
                // 使用方法
                copyTextToClipboard(page_json);
            }
        });
    })
}, 500)

async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText("");
        await navigator.clipboard.writeText(text);
        console.log('Text copied to clipboard');
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
}
