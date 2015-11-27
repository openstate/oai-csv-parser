(function() {

"use strict";

//headerData contains all the information about the first row of the CSV
var headerData, errors;

var textblob = "";

var failedRows;
var headerRowCount;

//now is the creationdata of the OAI respository
var now = new Date();
now = now.format('isoDate');

//the xml file header contains identify information.
var IdentifyInfo = {
    repositoryName:'Demo',
    baseURL:'http://demo.nl',
    protocolVersion:'2.0',
    adminEmail:'demo@oai.org',
    earliestDatestamp: now,
    deletedRecord:'no',
    granularity:'YYYY-MM-DD'
};
//
var itemDateGranularity;

$(function(){

    $( "#csvform" ).submit(function( event ) {

        event.preventDefault();
        $('#submitbutton').button('loading');

        //override the adjustable IdentifyInfo fields
        if( $('#respname').val() )
            IdentifyInfo.repositoryName = $('#respname').val();
        if( $('#adminEmail').val() )
            IdentifyInfo.adminEmail = $('#adminEmail').val();
        if( $('#baseURL').val() )
            IdentifyInfo.baseURL = $('#baseURL').val();

        itemDateGranularity = $( "#granularity").val();

        //the parser blocks DOM updates, so give dom some  
        //time to update.
        setTimeout(function(){
            checkFileTypeAndParse();
        }, 100);

    });

});

//parse file based on extention.
function checkFileTypeAndParse(){
    var filename = $('#inputcsv').val();
    var extention = filename.split(".").pop();

    failedRows = [];

    if(extention == 'csv'){
        parseCSVFile();
    } 
    else if(['xlsx','xls'].indexOf(extention) > -1 ){
        parseExcelFile();
    }
    else {
        console.log('wrong file type')
    }
}

//read the CSV file and append to the textblob
function parseCSVFile(){
    var error = false;
    $('#inputcsv').parse({
        before: function(file, inputElem)
        {
            var rowNumber = 1;            
            Papa.parse(file, {
                //using step the parser is able to parse bigger files.
                step: function(row, parser) {
                    console.log(row, rowNumber);

                    if(rowNumber === 1){
                        //check the header
                        if (checkHeader(row.data[0]))
                            console.log('header passed');
                        else {
                            parser.abort();
                            error = true; 
                        }
                    }
                    
                    if(rowNumber > 1){
                        if(checkColumnCount(row.data[0], rowNumber)){
                            console.log('row '+rowNumber+' passed');
                            addRecord(row.data[0], rowNumber);
                        }
                    }
                    rowNumber++;
                }
            });
        },
        error: function(err, file, inputElem, reason)
        {
            console.log(err, inputElem, reason);
            // executed if an error occurs while loading the file,
            // or if before callback aborted for some reason
        },
        
        complete: function()
        {   
            if(!error){
                finishAndSaveFile();
                $('#submitbutton').button('reset');  
            }               
            
        }
    });   
};

//parse a Excel File
function parseExcelFile(){
    var file = document.getElementById('inputcsv').files[0];
    var reader = new FileReader();
    var name = file.name;
    console.log(name);
    reader.onload = function(e) {
        var data = e.target.result;

        var workbook = XLSX.read(data, {type: 'binary'});

        var sheetNameList = workbook.SheetNames;
        var worksheet = workbook.Sheets[sheetNameList[0]];
        console.log(sheetNameList);

        var data = XLSX.utils.sheet_to_row_object_array(worksheet, {header:1});

        if (checkHeader(data[0]))
            console.log('header passed');
        else
            return;

        for (var i = 1; i < data.length; i++) {
            if(checkColumnCount(data[i], i+1)){
                console.log('row '+(i+1)+' passed');
                addRecord(data[i], i+1);
            }
        };

        finishAndSaveFile();
        $('#submitbutton').button('reset');     

    };
    reader.readAsBinaryString(file);
}

//check if Number of Columns is correct
function checkColumnCount(row, rowNum){
   var numOfColsInRow = row.length;
   if(numOfColsInRow < 2){
        failedRows.push({num:rowNum, reason:'empty row', mesType: 'error'});
   }
   else if(headerRowCount != numOfColsInRow){
        //rows need to be the same length
        failedRows.push({num:rowNum, reason:'incorrect number of colums ('+numOfColsInRow+'/'+headerRowCount+')', mesType: 'error'});
   } 
   else {
       return true;
   }
}

//check if the headerRow of the CSV conforms to OAI
var checkHeader = function(headerrow){
     var errors = [];

    //the allowed fields of Dubln, core.
    var allowedfieldsDC = [
        'title','creator','subject','description',
        'contribitor','publisher','date','type','format','identifier',
        'source','language','relation','coverage','rights'
    ];
    
    headerRowCount = headerrow.length;

    headerData = {
        firstrow: headerrow,
        fields: []
    };

    headerData.firstrow = headerrow;
    if(headerrow[0] != 'UniqueIdentifier')
        errors.push( 'first CSV colum must be UniqueIdentifier');


    for (var i = 1, j = headerrow.length; i < j; i++) {
        var headerfield = headerrow[i];

        if(_.contains(allowedfieldsDC, headerfield)){
            headerData.fields.push(i);
        } else {
            errors.push(headerfield + ' is not part of Dublin Core');
        }
    }

    if(errors.length === 0)
        return true;
    else
        showErrors(errors);
};

//add one Item to the blob
function addRecord(row, rowNum){
    
    //check for identifier and fail if not present.
    var id = row[0];
    if(id.length < 1)   {
        failedRows.push({num:rowNum + 1, reason:"no UniqueIdentifier", mesType:'error' });
        return;
    }
    var tempBlob = "";

    var xml = [
        '<oai:record> ' ,
        ' <oai:header> ',
        '  <oai:identifier>'+row[0]+'</oai:identifier>',
        '  <oai:datestamp>'+now+'</oai:datestamp>',
        ' </oai:header>' ,
        ' <oai:metadata>' ,
        '  <oai_dc:dc' ,
        '   xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" ' ,
        '   xmlns:dc="http://purl.org/dc/elements/1.1/" ' ,
        '   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' ,
        '   xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ ' ,
        '   http://www.openarchives.org/OAI/2.0/oai_dc.xsd"> '
    ];

    tempBlob = addToBlob(tempBlob, xml);

    //for every headerfield check if it exits and append to blob.
    for (var i = 0, j = headerData.fields.length; i < j; i++) {
        var colNum = headerData.fields[i];
        var prop = headerData.firstrow[colNum];
        var value = row[colNum];
        if(prop == 'date' && !checkDateFormatting(value))
            failedRows.push({num:rowNum + 1, reason:'invalid date string "'+value+'"', mesType: 'warning'});
  
        if(value && value.length > 0)
            tempBlob += '   <dc:'+prop+'>'+value+'</dc:'+prop+'>\n';
    }

    var xmlend = [
        '  </oai_dc:dc> ' ,
        '  </oai:metadata> ' ,
        '   </oai:record>' ];
    
    tempBlob = addToBlob(tempBlob, xmlend);

    //only add the tempblob to the textblob if there are no errors.
    textblob += tempBlob;   
}

function checkDateFormatting(datestring){
    var date = new Date(datestring);
    console.log(datestring, date.getYear());
    if ( isNaN( date.getYear() ) )
        return false;
    else
        return true;
}

//create the static repository header.
function createXMLHeader(){
    var string = "";
    var headerstart = [
    '<?xml version="1.0" encoding="UTF-8"?> ',
    '<Repository xmlns="http://www.openarchives.org/OAI/2.0/static-repository"  ',
    '            xmlns:oai="http://www.openarchives.org/OAI/2.0/" ',
    '            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ',
    '            xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/static-repository ',
    '                                http://www.openarchives.org/OAI/2.0/static-repository.xsd">',
    '   <Identify>'];

    string = addToBlob(string, headerstart);

    _.each(IdentifyInfo, function (value, prop) {
        string += '   <oai:'+prop+'>'+value+'</oai:'+prop+'>\n';
    });

    var headerend = [
    '   </Identify>',
    '   <ListMetadataFormats>',
    '     <oai:metadataFormat>',
    '       <oai:metadataPrefix>oai_dc</oai:metadataPrefix>',
    '       <oai:schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</oai:schema>',
    '       <oai:metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/',
    '           </oai:metadataNamespace>',
    '     </oai:metadataFormat>',
    '   </ListMetadataFormats>',
    '   <ListRecords metadataPrefix="oai_dc">'];

    string = addToBlob(string, headerend);

    return string;
}

//bundle everything and save xml
function finishAndSaveFile () {
   var header = createXMLHeader();
  
   var failed = failedRows.length;
   var failedRowstring = "";

   //remove previous results
   $('#failedtable tr:not(:first)').remove();

   //print the failed rows
   _.each(failedRows, function(row){
        var label = "";

        if(row.mesType == 'warning')
            label = '<span class="label label-warning">Warning</span>';
        else if(row.mesType == 'error')
            label = '<span class="label label-danger">Error</span>';

        $('#failedtable').append('<tr><td>'+row.num+'</td><td>'+label+'</td><td>'+row.reason+'</td><tr>');
   });
   
   textblob = header + textblob;   
   textblob += '  </ListRecords>\n' +
                '</Repository>';

   var blob = new Blob([textblob], {type: "text/plain;charset=utf-8"});

    $('#resultpanel').show();
    if(failed > 0){
        $('#failednum').html(failed);
        $('#failedrows').html(failedRowstring);
        $('.failed').show();
        $('.succes').hide();
    } else {
        $('#errorpanel').hide();
        $('.failed').hide();
        $('.succes').show();
    }

    $('#downloadbutton').click( function(){
        console.log('trying to save file');
        saveAs(blob, IdentifyInfo['repositoryName'] +".xml");
    });
};

function addToBlob(blob, textarray){
    for (var i = 0, j = textarray.length; i < j; i++) {
        blob += textarray[i] + '\n';
    }
    return blob;
}

function showErrors(errors){
    $('#errorpanel').show();
    $('#resultpanel').hide();

    _.each(errors, function(error){
        $('#errorlist').append(
            '<li>'+error+'</li>'
            );
    });
};

})();