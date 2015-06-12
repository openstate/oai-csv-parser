<?php

$myfile = fopen("test.csv", "r") or die("Unable to open file!");
$csv = [];
while(! feof($myfile))
  {
  array_push($csv, fgetcsv($myfile));
  }


fclose($myfile);
echo '<pre>';
print_r($csv);
echo '</pre>';

$student_info = array($csv);

// creating object of SimpleXMLElement
$xml_student_info = new SimpleXMLElement("<?xml version=\"1.0\"?><student_info></student_info>");

// function call to convert array to xml
array_to_xml($student_info,$xml_student_info);

//saving generated xml file
$xml_student_info->asXML('test.xml');


function array_to_xml($student_info, &$xml_student_info) {
    foreach($student_info as $key => $value) {
        if(is_array($value)) {
            if(!is_numeric($key)){
                $subnode = $xml_student_info->addChild("$key");
                array_to_xml($value, $subnode);
            }
            else{
                $subnode = $xml_student_info->addChild("item$key");
                array_to_xml($value, $subnode);
            }
        }
        else {
            $xml_student_info->addChild("$key",htmlspecialchars("$value"));
        }
    }
}


?>

