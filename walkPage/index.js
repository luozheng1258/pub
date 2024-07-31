const express = require('express');
const multiparty = require('multiparty');
const fs = require('fs');
const app = express();
const port = 8703;
const child_process = require('child_process');

const startUrlPage = fs.readFileSync('app/walkpage.html', 'utf-8');

app.get('/walkpage', (req, res) => {
  res.send(startUrlPage);
});

app.post('/api/walkPage', (req, res) => {
  console.log('done body:', req.body, 'done params:', req.params, 'formdata');
  let form = new multiparty.Form();
  form.parse(req, function (err, fields, file) {
    console.log(fields);
    if (fields.url) {
      const walkTarget = fields.url[0];

      var result = child_process.spawn('node', [
        'app/walkTreeApp4.mjs',
        walkTarget,
      ]);
      let filePath = '';
      result.on('close', function (code) {
        console.log('child process exited with code :' + code);
        if (code == 0 && filePath) {
          // const readStream = fs.createReadStream('output/layerTree/result.json');
        } else {
          if (!filePath) {
            res.send('err');
          }
        }
      });

      result.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
        // if (data && (data + "").match(/write compress done:/)) {
        //   let url = (data + "").slice("write compress done:".length).trim();
        if (data && (data + '').match(/write json done:/)) {
          filePath = (data + '').slice('write json done:'.length).trim();

          const readStream = fs.createReadStream(filePath);
          readStream.pipe(res);
          // // //   fs.createReadStream(url).pipe(res);
          // // //   getUrlPage = startUrlPage.replace(/\{\{url\}\}/, "" + url);
          // res.json({ jsonStr: jsonData });
          //   const readStream = fs.createReadStream('output/layerTree/result.json');
          //   readStream.pipe(res);
        }
      });

      result.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
      });
      //   res.send("done:" + walkTarget);
    } else {
      res.send('先填写爬取的url');
    }
  });
});

app.listen(port, () => {
  console.log('http://localhost:' + port + '/walkpage');
});
