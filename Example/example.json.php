<?php
if(isset($_POST['kb_request'])) {
	session_start();
	$res = array();
	switch($_POST['kb_request']) {
		case 'kb_fetch_all':
			$res['users'] = array(array("uid" => "1", "src" => null, "name" => "Example user"));
			break;
	}
	echo json_encode($res);
}