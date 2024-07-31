if (chrome) {
    chrome.runtime.sendMessage({ inject: true }, response => {
        window.loading = false;
        console.log("get response", response)
        if (response.done && response.result) {
            var page_json = JSON.stringify({ nodes: response.pageResult, type: "web" });

            try {
                navigator.clipboard.writeText(page_json);
                _funcCb(true, { isSuccess: true })
            } catch (err) {
                console.error('Failed to copy: ', err);
                _funcCb(true, { isSuccess: false, errData: "Failed to copy" })
            }
        }
    });
} else {
    _funcCb(true, { isSuccess: false, errData: "no chrome" })

}
