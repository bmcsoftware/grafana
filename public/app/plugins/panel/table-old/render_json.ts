import { isArray as _isArray } from 'lodash';
import moment from 'moment'; // eslint-disable-line no-restricted-imports

/*
 * @param: String and timezone
 * @Arguments type: BWF string + JSON data
 * Descirption: take string as a input and check its case types and call "generateKeyValue" function for KEY:VALUE pair
 */

export function RenderJSON(data: any, tz: any, ctrl: any) {
  let html_data = '<div class="json-type-content">';
  if (typeof data === 'string') {
    if (data.indexOf('CASE##ID') === 0 || data.indexOf('TASK##ID') === 0) {
      let tempDataArray = data.split('##');
      html_data += generateKeyValue(tempDataArray, 'Audit_Trail_Report', ctrl.datasource.instSet.jsonData.platformURL);
    } else if (data.indexOf('FORMAT_DYNAMIC_DATA') === 0) {
      let tempDataArray = data.split('##');
      html_data += generateKeyValue(tempDataArray, 'Summary_Report');
    } else if (data.indexOf('SOCIAL##ID') === 0) {
      let tempDataArray = data.split('##');
      html_data += generateKeyValue(tempDataArray, 'Social_activity');
    } else {
      html_data = html_data + data;
    }
  } else {
    html_data = html_data + data;
  }
  return (html_data = html_data + '</div>');
}

/*
 * @param: String, String
 * @Arguments type: data: recived string format, case_type:string contain case name.
 * Descirption: take data and case as a input and split that data according to case type parameters. After spliting data pass this data to the "parseDataType" function make sure data is reder according to itd data type
 */
function generateKeyValue(data: any, case_type: string, platformUrl?: any) {
  let html_data = '';
  if (case_type === 'Summary_Report') {
    html_data = getSummaryReport(data);
  } else if (case_type === 'Audit_Trail_Report') {
    html_data = getAuditTrialReport(data, platformUrl);
  } else if (case_type === 'Social_activity') {
    let post_type = '';
    let post_details = null;
    let auther = '';
    for (let i = 0; i < data.length; i++) {
      if (data[i].indexOf('Post Type:') === 0) {
        post_type = data[i].split(':')[1].trim();
      } else if (data[i].indexOf('Post Details:') === 0) {
        post_details = data[i].replace('Post Details: ', '');
      } else if (data[i].indexOf('Author:') === 0) {
        auther = data[i].split(':')[1].trim();
      }
    }
    return generateSocialActivity(post_type, post_details, auther);
  }
  return html_data;
}

/*
 * @param: String,any,json(optional)
 * @Arguments type:
 *    dataType: Text,Number,Time,Boolean,date,Date Time,attachment,list, case_type.
 *    value: it is according to the datatype.
 *    data_def: it is contains the json data type for "Dynamic Group"
 * Descirption: take dataType and vlues as a input convert that value according to its data types
 */
function parseDataType(dataType: string, value: any, data_def: any) {
  switch (dataType) {
    case 'LIST':
    case 'TEXT':
      return value;

    case 'NUMBER':
      if (value === null || value === void 0) {
        return '-';
      }
      if (isNaN(value) || _isArray(value)) {
        return value;
      }
      if (value.includes('.')) {
        return Number(value).toFixed(2);
      } else {
        return value;
      }

    case 'TIME':
      const split_time = value.split(':');
      if (split_time.length !== 3) {
        return 'Invalid Time';
      } else {
        let hours = split_time[0];
        let minutes = split_time[1];
        let ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let strTime = hours + ':' + minutes + ':' + split_time[2] + ' ' + ampm;
        return strTime;
      }

    case 'DATE_TIME':
    case 'date_time':
      return moment.unix(Number(value)).tz(moment.tz.guess()).format('D-MMMM-YYYY h:mm:ss a');

    case 'DATE':
      return moment.unix(Number(value)).tz(moment.tz.guess()).format('D-MMMM-YYYY');

    case 'BOOLEAN':
      if (value === '1') {
        return 'Yes';
      } else {
        return 'No';
      }

    case 'ATTACHMENT':
      return 'Attachment Present';
    case 'attributes':
      let parse_value = '';
      let html_data = '';
      for (let key in value) {
        for (let j = 0; j < data_def.length; j++) {
          if (key === data_def[j].name && data_def[j].hidden === false && data_def[j].confidential === false) {
            parse_value = parseDataType(data_def[j].dataType, value[key], null);
            html_data +=
              '<div class="json-type"><span class="key-field">' +
              key +
              '</span><span class="separator">:</span><span class="value-field">' +
              parse_value +
              '</span></div>';
          }
        }
      }
      return html_data;

    default:
      return value;
  }
}

/*
 * @param: text
 * @Arguments type: String
 * @Description: It takes string as a input and check it is a type of json or not
 */
function testJSON(text: any) {
  if (typeof text !== 'string') {
    return false;
  }
  try {
    JSON.parse(text);
    return true;
  } catch (error) {
    return false;
  }
}

function checkAlternateKey(key: any) {
  switch (key) {
    case 'Ticket Status GUID':
      return 'Status';
    case 'Assignee GUID':
      return 'Assignee';
    case 'SITE_ID':
      return 'Site';
    case 'ASSIGNED COMPANY_ID':
      return 'Assigned Company';
    case 'LABEL_ID':
      return 'Label';
    default:
      return key;
  }
}

function generateSocialActivity(post_type: any, post_details: any, auther: any) {
  switch (post_type) {
    case 'system#email':
      let tempData = post_details.split(',');
      let check = 0;
      for (let i = 0; i < tempData.length; i++) {
        if (tempData[i].includes('fullName')) {
          if (check === 1) {
            let sentTo = tempData[i].split(':')[1];
            return 'Email sent to ' + sentTo;
          }
          check = 1;
        }
      }
      return '';
    case 'system#Views':
    case 'system#views':
      if (testJSON(post_details)) {
        post_details = JSON.parse(post_details);
        return auther + ' has viewed the case ' + post_details.viewCount + ' times';
      }
      return 'Invalid Data';

    case 'system#pinvalidation':
      if (testJSON(post_details)) {
        post_details = JSON.parse(post_details);
        return 'PIN validation ' + post_details.validationStatus;
      }
      return 'Invalid Data';

    case 'comment#user':
      tempData = post_details.split(',"');
      for (let i = 0; i < tempData.length; i++) {
        if (tempData[i].includes('text"')) {
          let comments = tempData[i].split('":')[1];
          return comments;
        }
      }
      return '';
    case 'system#approval':
      if (testJSON(post_details)) {
        post_details = JSON.parse(post_details);
        if (post_details.entities.status === '1') {
          return 'Approval granted for ' + post_details.entities.approvalID;
        } else if (post_details.entities.status === '2') {
          return 'Approval rejected  for ' + post_details.entities.approvalID;
        }
      }
      return '';
    case 'system#association':
      if (testJSON(post_details)) {
        let tempHTML = 'Relationship ';
        post_details = JSON.parse(post_details);

        if (post_details.operation === 'ADD') {
          tempHTML += 'added for ';
        } else {
          tempHTML += 'removed for ';
        }
        tempHTML += ' ';
        if (post_details.type === 'Case') {
          tempHTML += post_details.displayID;
        } else {
          tempHTML += post_details.fullName;
        }
        return tempHTML;
      }
      return '';

    default:
      return 'Invalid Post Type';
  }
}

function getSummaryReport(data: any) {
  let html_data = '';
  for (let j = 0; j < data.length; j++) {
    if (data[j].indexOf('Dynamic Data:') === 0) {
      let parse_dyn_data = null;
      let parsedyn_data_def = null;
      let dyn_data = data[j].replace('Dynamic Data:', '');
      if (testJSON(dyn_data)) {
        parse_dyn_data = JSON.parse(dyn_data);
      }
      let dyn_data_def = data[j + 1].replace('Dynamic Data Definition:', '');
      if (testJSON(dyn_data_def) && dyn_data_def.trim() !== '') {
        parsedyn_data_def = JSON.parse(dyn_data_def);
        if (parse_dyn_data !== null && parsedyn_data_def !== null) {
          for (let key in parse_dyn_data) {
            for (let i = 0; i < parsedyn_data_def.length; i++) {
              let parse_value = '';
              if (
                key === parsedyn_data_def[i].name &&
                (parsedyn_data_def[i].hidden === false || parsedyn_data_def[i].hidden === undefined) &&
                !parsedyn_data_def[i].hasOwnProperty('attributes')
              ) {
                parse_value = parseDataType(parsedyn_data_def[i].dataType, parse_dyn_data[key], null);
                html_data +=
                  '<div class="json-type"><span class="key-field">' +
                  key +
                  '</span><span class="separator">:</span><span class="value-field">' +
                  parse_value +
                  '</span></div>';
              } else if (key === parsedyn_data_def[i].name && parsedyn_data_def[i].hasOwnProperty('attributes')) {
                parse_value = parseDataType('attributes', parse_dyn_data[key], parsedyn_data_def[i].attributes);
                html_data +=
                  '<div class="json-type"><span class="key-field">' +
                  key +
                  '</span><span class="separator">:</span><span class="value-field">' +
                  parse_value +
                  '</span></div>';
              }
            }
          }
        } else {
          html_data += '<div class="json-type">Invalid JSON Data Format</div>';
        }
      } else {
        if (dyn_data_def.trim() === '') {
          html_data += '<div class="json-type"></div>';
        } else {
          html_data += '<div class="json-type">Invalid JSON Data Format</div>';
        }
      }
    }
  }
  return html_data;
}

function getAuditTrialReport(data: any, platformUrl: any) {
  let html_data = '';
  let confin_data = '';
  let action = '';
  for (let k = 0; k < data.length; k++) {
    if (data[k].indexOf('Action:') === 0) {
      let key_values = data[k].split(':');
      action = key_values[1].trim();
    }
  }

  for (let j = 0; j < data.length; j++) {
    if (data[j].indexOf('Fields Changed:') === 0) {
      let split_data = data[j].split(';');
      for (let i = 0; i < split_data.length; i++) {
        if (split_data[i] !== '') {
          split_data[i] = checkAlternateKey(split_data[i]);

          if (split_data[i] === 'Confidential Data Audit Info') {
            confin_data += '<div class="json-type"><span>Confidential Case Data was modified.</span></div>';
          }
          for (let k = 0; k < data.length; k++) {
            if (split_data[i] === 'Dynamic Data Audit Info') {
              if (data[k].indexOf(split_data[i] + ':') === 0) {
                let parse_json = null;
                let temp_parse_json = data[k].replace(split_data[i] + ':', '');
                if (testJSON(temp_parse_json)) {
                  parse_json = JSON.parse(temp_parse_json);
                  for (let key in parse_json.quetsionAnswerMap) {
                    if (parse_json.quetsionAnswerMap[key].confidential === false) {
                      let dataVal =
                        parse_json.quetsionAnswerMap[key].listType?.toUpperCase() === 'DYNAMIC'
                          ? parse_json.quetsionAnswerMap[key].displayAnswer
                          : parse_json.quetsionAnswerMap[key].answer;
                      let parse_value = parseDataType(parse_json.quetsionAnswerMap[key].dataType, dataVal, null);
                      html_data +=
                        '<div class="json-type"><span class="key-field">' +
                        parse_json.quetsionAnswerMap[key].questionDescription +
                        '</span><span class="separator">:</span><span class="value-field">' +
                        parse_value +
                        '</span></div>';
                    }
                  }
                } else {
                  let key_values = data[k].split(':');
                  if (!(key_values[1].trim() === '' && action === '4')) {
                    html_data +=
                      '<div class="json-type"><span class="key-field">Dynamic Data Audit Info</span><span class="separator">:</span><span class="value-field"></span></div>';
                  }
                }
              }
            } else if (data[k].indexOf(split_data[i] + ':') === 0) {
              let key_values;
              if (data[k].indexOf('<img') < 0) {
                key_values = data[k].split(':');
              } else {
                let img;
                let key = data[k].indexOf(':');
                let string = data[k].slice(key + 1);
                let srcIndex = string.indexOf('/api');
                if (srcIndex) {
                  img = string.slice(0, srcIndex) + platformUrl + string.slice(srcIndex);
                  key_values = [data[k].slice(0, key), img];
                }
              }
              if (!(key_values[1].trim() === '' && action === '4')) {
                html_data +=
                  '<div class="json-type"><span class="key-field">' +
                  key_values[0] +
                  '</span><span class="separator">:</span><span class="value-field">' +
                  key_values[1] +
                  '</span></div>';
              }
            }
          }
        }
      }
      html_data += confin_data;
      break;
    }
  }
  return html_data;
}
