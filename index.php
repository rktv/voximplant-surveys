<?php
define("API_URL", "https://api.voximplant.com/platform_api/");
define("API_KEY", "");
define("ACCOUNT_NAME", "");
define("RULE_ID", 323024);

function httpRequest($url,$params) {
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
	if (isset($params["post"])) curl_setopt($ch, CURLOPT_POST, 1);
	if (isset($params["post_data"])) curl_setopt($ch, CURLOPT_POSTFIELDS, $params["post_data"]);
	curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/csv'));
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$server_output = curl_exec ($ch);
	curl_close ($ch);
	return $server_output;
}

function createCallList($file) {
	$url = API_URL . "CreateCallList/?" .
		"account_name=" . ACCOUNT_NAME .
		"&api_key=" . API_KEY .
		"&rule_id=" . RULE_ID .
		"&max_simultaneous=10" .
		"&num_attempts=2" .
		"&interval_seconds=30" .
		"&priority=1" .
		"&name=CallList";

	$data = file_get_contents($file);
	$params = array('post' => true, 'post_data' => $data);
	$result = httpRequest($url, $params);
	echo $result;
}

function getCallListDetails($list_id, $output = "json") {
	$url = API_URL . "GetCallListDetails/?" .
		"account_name=" . ACCOUNT_NAME .
		"&api_key=" . API_KEY .
		"&list_id=" . $list_id .
		"&encoding=Windows-1251" .
		"&output=" . $output;

	$params = array();
	$result = httpRequest($url, $params);

	echo "<pre>";
	print_r($result);
	echo "</pre>";
}

/*Adds a new CSV file for call list processing and starts the specified rule immediately. To send a file, use the request body.
To set the call time constraints, use the options __start_execution_time and __end_execution_time in CSV file. Time is in 24-h format: HH:mm:ss.
IMPORTANT: the account's balance should be equal or be greater than 1 USD. If the balance is lower than 1 USD, the call list processing wouldn't start.

For more information visit https://voximplant.com/docs/references/httpapi/#toc-createcalllist*/

createCallList('numbers.csv');

/*
Get details of the tasks of outgoing calls. Default return CSV file.
For more information visit https://voximplant.com/docs/references/httpapi/#toc-getcalllistdetails*/

//$list_id = ;
//getCallListDetails($list_id, "csv");
?>