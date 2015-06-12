var CSVData;

var now = new Date();
now = now.format('isoDate');

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
  		//alert( "Handler for .submit() called." );
  		event.preventDefault();
  		$('#submitbutton').button('loading');

  		if( $('#respname').val() ) 
  			IdentifyInfo.repositoryName = $('#respname').val();
  		if( $('#adminEmail').val() ) 
  			IdentifyInfo.adminEmail = $('#adminEmail').val();
  		if( $('#baseURL').val() ) 
  			IdentifyInfo.baseURL = $('#baseURL').val();

  		setTimeout(function(){
    		readFileandAppend();
		}, 100);
  		

	});

});

var abort = false;
var failed = 0;
var errors;
function readFileandAppend(listElem){

	$('#inputcsv').parse({
		before: function(file, inputElem)
		{	
			var size = file.size;
  			var percent = 0;
  			var countRow = 0;
  			errors = [];
  			
			Papa.parse(file, {
				
				//worker: ' true',
				 step: function(row, parser) {
				 	 if(countRow == 0){
				 	  	
				 	  	var headerOk = checkHeader(row.data[0]);
				 	  	if (!headerOk){
				 	  		parser.abort();


				 	  	}
				 	  }
				 	  if(abort)
				 			parser.abort()
				 	  
				 	  if(countRow > 1){
					  	  succes = addRecord(row.data[0]);
					 	  if(!succes)
					 	  	failed++;

				 		  var progress = row.meta.cursor;
					      var newPercent = Math.round(progress / size * 100);
					      if (newPercent === percent) return;
					      percent = newPercent;
					      console.log(percent);
					  }
					  countRow++;

				}
			})
		},
		
		complete: function()
		{
			if(errors.length == 0){
				finishAndSaveFile();
				console.log(failed);
				$('#submitbutton').button('reset');
			}else {
				$('#submitbutton').button('reset');
				showErrors();
			}


		}
});
}

var headerfieldsDC = ['setSpec'];

var allowedfieldsDC = [
	'setSpec','title','creator','subject','description',
	'contribitor','publisher','date','type','format','identifier',
	'source','language','relation','coverage','rights'
	]

var headerData; 
var checkHeader = function(headerrow){
	headerData = {
		firstrow: headerrow,
		normalfields: [],
		headerfields: []
	};
	headerData.firstrow = headerrow;
	if(headerrow[0] != 'UniqueIdentifier')
		errors.push( 'first CSV colum must be UniqueIdentifier');

	for (var i = 1, j = headerrow.length; i < j; i++) {
		var headerfield = headerrow[i];

		if(_.contains(allowedfieldsDC, headerfield)){
			if(_.contains(headerfieldsDC, headerfield))
				headerData.headerfields.push(i);
			else
				headerData.normalfields.push(i);
		} else {
			errors.push(headerfield + ' is not part of Dublin Core');
		}
	};

	if(errors.length == 0)
		return true;
	else
		return false;
}



function addRecord(row){
	var id = row[0];
	//check for identifier
	if(id.length < 1)	{
		return false;
	}

	var xml = [
		'<oai:record> ' ,
		' <oai:header> ',
		'  <oai:identifier>oai:'+row[0]+'</oai:identifier>',
		'  <oai:datestamp>'+now+'</oai:datestamp> ',
	]

	for (var i = 0, j = xml.length; i < j; i++) {
		textblob += xml[i] + '\n';  
	};
	
	for (var i = 0, j = headerData.headerfields.length; i < j; i++) {
		var colNum = headerData.headerfields[i];
		var prop = headerData.firstrow[colNum];
		var value = row[colNum];
		if(value.length > 0)
			textblob += '   <oai:'+prop+'>'+value+'</oai:'+prop+'>\n'; 
	}	

	var xml2 = [
		' </oai:header> ' ,
		' <oai:metadata> ' ,
		'  <oai_dc:dc ' ,
		'   xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" ' ,
		'   xmlns:dc="http://purl.org/dc/elements/1.1/" ' ,
		'   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' ,
		'   xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ ' ,
		'   http://www.openarchives.org/OAI/2.0/oai_dc.xsd"> ' ];
	
	for (var i = 0, j = xml2.length; i < j; i++) {
		textblob += xml2[i] + '\n';  
	};

	for (var i = 0, j = headerData.normalfields.length; i < j; i++) {
		var colNum = headerData.normalfields[i];
		var prop = headerData.firstrow[colNum];
		var value = row[colNum];
		if(value.length > 0)
				textblob += '   <dc:'+prop+'>'+value+'</dc:'+prop+'>\n'; 
	}

	var xmlpost = [
		'  </oai_dc:dc> ' ,
		'  </oai:metadata> ' ,
		'   </oai:record>' ]

	
	for (var i = 0, j = xmlpost.length; i < j; i++) {
		textblob += xmlpost[i] + '\n'  
	};
	return true;
}



var ListMetadataFormatsArray = [
	{
		metadataPrefix:'oai_dc',
		schema:'http://www.openarchives.org/OAI/1.1/rfc1807.xsd',
		metadataNamespace:'http://www.openarchives.org/OAI/2.0/oai_dc/'
	}
]

function createXMLHeader(){
var string = "";
var headerstart = [
'<?xml version="1.0" encoding="UTF-8"?> ',
'<Repository xmlns="http://www.openarchives.org/OAI/2.0/static-repository"  ',
'            xmlns:oai="http://www.openarchives.org/OAI/2.0/" ',
'            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ',
'            xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/static-repository ',
'                                http://www.openarchives.org/OAI/2.0/static-repository.xsd">',
'   <Identify>']


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
'   <ListRecords metadataPrefix="oai_dc">']

	for (var i = 0, j = headerstart.length; i < j; i++) {
		string += headerstart[i] + '\n'  
	};

	_.each(IdentifyInfo, function (value, prop) {  
    	string += '   <oai:'+prop+'>'+value+'</oai:'+prop+'>\n'; 
	});

	for (var i = 0, j = headerend.length; i < j; i++) {
		string += headerend[i] + '\n'  
	};

	return string;
}

function addChildrenToElementWithNamespace(elem, infoObject, namespace){
	_.each(infoObject, function(val, key){
		var childElem = (namespace) ? 
			new marknote.Element(new marknote.QName(namespace, key)) :
			new marknote.Element(qname);
			
			childElem.setText(val);

			elem.addChildElement(childElem);
		});
}





finishAndSaveFile = function () {
   header = createXMLHeader();
   textblob = header + textblob;
   textblob += '  </ListRecords>\n' +
  				'</Repository>'

  	var blob = new Blob([textblob], {type: "text/plain;charset=utf-8"});

  	$('#resultpanel').show();
  	if(failed > 0){
  		$('#failednum').html(failed);
  		$('#failed').show();
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
	})
	





}
//*/



