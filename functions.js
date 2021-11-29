const RECIPIENTS = SpreadsheetApp.getActive().getSheetByName('recipients');

const debug_flg = false;


function debug_log(contents){
  if(debug_flg === true){
    SpreadsheetApp.getActive().getSheetByName('Debugging').appendRow(contents);
  }else{
    return;
  }
}


function setRecipient(user_id, url) {
  const recipients = RECIPIENTS.getDataRange().getValues();
  for(let row = 1; row < recipients.length; row++){
    if(recipients[row][0] === url){
      let previous_tokens = JSON.parse(recipients[row][1]).user_id;
      if(previous_tokens.includes(user_id)){
        return false;
      }else{
        previous_tokens.push(user_id);
        return true;
      }
    }
  }
  const user_ids = {user_ids: [user_id]};
  RECIPIENTS.appendRow([url, JSON.stringify(user_ids)]);
  return true;
}

// 返答用
function doPost(e) {
  //debug用
  if(debug_flg === true){
    e = {
      postData: {
        contents: {
          events: [{replyToken: 'test_token', message: {text: 'message'}}]
        }
      }
    }
  }

  try{
    const post_json = JSON.parse(e.postData.contents).events[0];
    const reply_token = post_json.replyToken;
    const user_id = post_json.source.userId;
    const url = post_json.message.text;
    debug_log([reply_token, url]);

    if (typeof reply_token === 'undefined') {
      return;
    }else if(url.match(/https:\/\/eikaiwa\.dmm\.com\/teacher\/index/)){
      setRecipient(user_id, url);

      const dmmEnglishTeacher = new DmmTeacher(url);
      dmmEnglishTeacher.setTeacher();

      const reply_message = [{
        'type': 'text',
        'text': `${dmmEnglishTeacher.name}の通知設定が完了しました`,
      }];

      new LineBot._new(CHANNEL_ACCESS_TOKEN).sendReplyMessage(reply_token, reply_message);
    }else{
      const reply_error = [{
        'type': 'text',
        'text': 'urlを送信してね',
      }];

      new LineBot._new(CHANNEL_ACCESS_TOKEN).sendReplyMessage(reply_token, reply_error);
    }
    return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
  }catch(error){
    debug_log([error]);
  }
}


function sendReservableTime(){
  const recipients = RECIPIENTS.getDataRange().getValues();
  for(let row = 1; row < recipients.length; row++){
    const user_ids = JSON.parse(recipients[row][1]).user_ids;
    const url = recipients[row][0];

    const teacher = new DmmTeacher(url);
    const new_open = teacher.compareOpens();
    const name = new_open[0];
    const opens = JSON.parse(new_open[1])[name];
    let text = `${name}の空き時間
    昨日からの追加分`;
    for(let num = 0; num < opens.length; num++){
      const date = opens[num].slice(1, 6);
      if(text.match(date)){
        text += '\n' + opens[num].slice(8,12);
      }else{
        text += '\n' + opens[num];
      }
    }
    if(text.length > 3000){
      text = text.substr(0, 3000);
    }

    const message1 = {
      "type": "text",
      "text": text
    };

    const message2 = {
      "type": "template",
      "altText": `${name}の空き時間`,
      "template": {
          "type": "buttons",
          "text": "予約可能時間一覧",
          "actions": [
              {
                "type": "uri",
                "label": "詳細を確認",
                "uri": url
              }
          ]
      }
    };

    const message = [message1, message2];

    for(let num = 0; num < user_ids.length; num++){
      const user_id = user_ids[num];
      const dmmLineBot = LineBot._new(CHANNEL_ACCESS_TOKEN)
      dmmLineBot.sendPushMessage(user_id, message); 
    }
    teacher.setOpens();
  }
}