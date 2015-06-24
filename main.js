//headerData contains all the information about the first row of the CSV
var headerData, errors;

//now is the creationdata of the OAI respository
var now = new Date();
now = now.format('isoDate');

//the xml file header contains identify information.
var IdentifyInfo = {
    repositoryName:'Demo',
    baseURL:'http://demo.nl',
    protocolVersion:'2.0',
    adminEmail:'jon@oai.org',
    earliestDatestamp: now,
    deletedRecord:'no',
    granularity:'YYYY-MM-DD'
};

var textblob = "";


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

        //the parser blocks DOM updates, so give dom some  
        //time to update.
        setTimeout(function(){
            readFileandAppend();
        }, 100);

    });

});

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

//read the CSV file and append to the textblob
function readFileandAppend(listElem){
    var abort = false;
    var failedRows = [];
    $('#inputcsv').parse({
        before: function(file, inputElem)
        {
            var size = file.size;
            var percent = 0;
            var countRow = 0;
            errors = [];
            
            Papa.parse(file, {
                //using step the parser is able to parse bigger files.
                step: function(row, parser) {
                     console.log(row, countRow);
                     console.log("Row errors:",row.errors );
                     if(row.errors){
                        _.each(row.errors, function(error){
                            failedRows.push({num:countRow + 1, reason:error.message});
                        });
                        
                     }

                     if(countRow === 0){
                        
                        //check the header
                        var headerOk = checkHeader(row.data[0]);
                        if (!headerOk){
                            parser.abort();
                        }
                      }

                      if(countRow > 0){

                          succes = addRecord(row.data[0]);
                          if(!succes)
                            failedRows.push({num:countRow + 1, reason:"no UniqueIdentifier(is the row empty?"});

                          /*var progress = row.meta.cursor;
                          var newPercent = Math.round(progress / size * 100);
                          if (newPercent === percent) return;
                          percent = newPercent;
                          console.log(percent);*/
                      }
                      countRow++;
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
            if(errors.length === 0){
                finishAndSaveFile(failedRows);
                $('#submitbutton').button('reset');
            }else {
                $('#submitbutton').button('reset');
                showErrors(errors);
            }
        }
});
}

//check if the headerRow of the CSV conforms to OAI
var checkHeader = function(headerrow){
    //the allowed fields of Dubln, core.
    var allowedfieldsDC = [
        'title','creator','subject','description',
        'contribitor','publisher','date','type','format','identifier',
        'source','language','relation','coverage','rights'
    ];
    

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
        return false;
};


function addToBlob(blob, textarray){
    for (var i = 0, j = textarray.length; i < j; i++) {
        blob += textarray[i] + '\n';
    }
    return blob;
}


//add one Item to the blob
function addRecord(row){
    
    //check for identifier and fail if not present.
    var id = row[0];
    if(id.length < 1)   {
        return false;
    }

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

    textblob = addToBlob(textblob, xml);

    //for every headerfield check if it exits and append to blob.
    for (var i = 0, j = headerData.fields.length; i < j; i++) {
        var colNum = headerData.fields[i];
        var prop = headerData.firstrow[colNum];
        var value = row[colNum];
        if(value && value.length > 0)
            textblob += '   <dc:'+prop+'>'+value+'</dc:'+prop+'>\n';
    }

    var xmlend = [
        '  </oai_dc:dc> ' ,
        '  </oai:metadata> ' ,
        '   </oai:record>' ];
    
    textblob = addToBlob(textblob, xmlend);
    
    return true;
}

//bundle everything and save xml
finishAndSaveFile = function (failedrows) {
  
   var failed = failedrows.length;
   var header = createXMLHeader();
   var failedrowstring = "";

   _.each(failedrows, function(row){
        $('#failedtable').append('<tr><td>'+row.num+'</td><td>'+row.reason+'</td><tr>');
   });
   
   textblob = header + textblob;
   
   textblob += '  </ListRecords>\n' +
                '</Repository>';

   var blob = new Blob([textblob], {type: "text/plain;charset=utf-8"});

    $('#resultpanel').show();
    if(failed > 0){
        $('#failednum').html(failed);
        $('#failedrows').html(failedrowstring);
        //$('.failed').show();
    }

    $('#downloadbutton').click( function(){
        saveAs(blob, IdentifyInfo['repositoryName'] +".xml");
    });
};

showErrors = function(){
    $('#errorpanel').show();
    $('#resultpanel').hide();

    _.each(errors, function(error){
        $('#errorlist').append(
            '<li>'+error+'</li>'
            );
    });
};
