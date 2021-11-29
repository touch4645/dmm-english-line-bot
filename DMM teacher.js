const LOGS = SpreadsheetApp.getActive().getSheetByName('logs').getDataRange().getValues();
const TEACHERS = SpreadsheetApp.getActive().getSheetByName('teachers').getDataRange().getValues();

class DmmTeacher {
  constructor(url){
    this.url = url;
    this.html = this.getHtml();
    this.name = this.getName();
    this.row = this.getRow();
    this.opens = this.getOpens();
  }

  getHtml(){
    return UrlFetchApp.fetch(this.url).getContentText();
  }

  getName(){
    return Parser.data(this.html).from('<h1>').to('</h1>').build();
  }

  getOpens(){
    const lists = Parser.data(this.html)
    .from('<div class="schedules-list">')
    .to('</div>')
    .iterate();

    const timeRange = Parser.data(lists[0])
    .from('<span>')
    .to('-</span>')
    .iterate();

    const onedays = Parser.data(lists[0])
    .from('<ul class="oneday">')
    .to('</ul>')
    .iterate();

    let result = {};
    result[this.name] = [];

    for(let day in onedays){
      const events = Parser.data(onedays[day])
      .from('<li')
      .to('</li>')
      .iterate();
      console.log(events);
      const date = Parser.data(events[0]).from('style="width: 73px">').to('<br>').iterate();

      for(let num in events){
        if(events[num].match(/予約可/)){
          const time = timeRange[num - 1];
          console.log(`${this.name} ${date} ${time}`);
          result[this.name].push(`${date} ${time}`);
        }
      }
    }
    return [this.name, JSON.stringify(result)];
  }

  setOpens(){
    if(this.row === ''){
      SpreadsheetApp.getActive().getSheetByName('logs').appendRow(this.opens);
    }else{
      SpreadsheetApp.getActive().getSheetByName('logs').getRange(this.row, 2).setValue(this.opens[1]);
    }
  }

  getRow(){
    for(let row in LOGS){
      console.info(row);
      const name = LOGS[row][0];
      if(name === this.name){
        console.info(Number(row) + 1);
        return Number(row) + 1;
      }
    }
    return '';
  }

  compareOpens(){
    if(this.row === ''){
      return this.opens;
    }else{
      let compared_times = [];
      console.log(LOGS);
      const past_json = JSON.parse(LOGS[Number(this.row) - 1][1]);
      const past_times = past_json[this.name];

      const real_json = JSON.parse(this.opens[1]);
      const real_times = real_json[this.name];
      for(let real_num in real_times){
        let past_flg = 0;
        for(let past_num in past_times){
          if(past_times[past_num] === real_times[real_num]){
            past_flg++
          }
        }
        if(past_flg === 0){
          compared_times.push(real_times[real_num]);
        }
      }
      let result = {};
      result[this.name] = compared_times

      return [this.name, JSON.stringify(result)];
    }
  }

  setTeacher(){
    for(let row = 1; row < TEACHERS.length; row++){
      if(TEACHERS[row][0] === this.url){
        return false;
      }
    }
    let data = [this.url, this.name];
    SpreadsheetApp.getActive().getSheetByName('teachers').appendRow(data);
    return true;
  }
}


function my(){
  console.log(new DmmTeacher('https://eikaiwa.dmm.com/teacher/index/29345/').setOpens());
}