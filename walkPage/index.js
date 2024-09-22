const express = require('express');
const multiparty = require('multiparty');
const fs = require('fs');
const app = express();
const port = 8703;
const child_process = require('child_process');
const path = require('path');

const startUrlPage = fs.readFileSync(
  path.resolve(__dirname, 'app/walkpage.html'),
  'utf-8'
);

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
        path.resolve(__dirname, 'app/walkTreeApp4.mjs'),
        walkTarget,
        getChromeArgs({ args: process.argv.slice(2) }),
      ]);
      let filePath = '';
      let debugDetails = [];
      result.on('close', function (code) {
        console.log('child process exited with code :' + code);
        if (code == 0 && filePath) {
        } else {
          if (!filePath) {
            res.send(
              JSON.stringify({
                code,
                detail: 'child process exited',
                debugDetails,
              })
            );
          }
        }
      });

      result.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
        debugDetails.push(data + '');
        if (data && (data + '').match(/write json done:/)) {
          filePath = (data + '').slice('write json done:'.length).trim();
          const readStream = fs.createReadStream(filePath);
          readStream.pipe(res);
        }
      });

      result.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
        debugDetails.push(data + '');
      });
    } else {
      res.send('先填写爬取的url');
    }
  });
});

app.get('/', (req, res) => {
  res.send('Hi there!');
});
app.post('/', (req, res) => {
  let form = new multiparty.Form();
  console.log('done body:', req.body, 'done params:', req.params, 'formdata');
  form.parse(req, function (err, fields, file) {
    if (fields && fields.url) {
      const walkTarget = fields.url[0];
      res.send('walkTarget:' + walkTarget);
    } else {
      res.send('先填写爬取的url');
    }
  });
});

app.listen(port, () => {
  console.log('http://localhost:' + port + '/walkpage');
});

function getChromeArgs({ args }) {
  if (!Array.isArray(args)) return;
  let chromeArgsStr = args.find((arg) => arg.startsWith('--chrome-args='));
  return chromeArgsStr;
}
