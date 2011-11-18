<?php
/**
----------------------------------------------------------------------+
*  @desc			Example json backend
----------------------------------------------------------------------+
*  @file 			example.json.php
*  @since 		    Nov 7, 2011
*  @package 		jQuery.Kanban
----------------------------------------------------------------------+
*/
if(isset($_POST['kb_request'])) {
	session_start();
	if(!isset($_SESSION['kanban_test'])) {
		$_SESSION['kanban_test'] = array(
			'kb_column_1' => array(),
			'kb_column_2' => array(),
			'kb_column_3' => array(),
			'kb_column_4' => array(),
			'users' => array(
				array("uid" => "1", "src" => null, "name" => "Example user")
			)
		);
	}
	$res = array();
	switch($_POST['kb_request']) {
		case 'kb_fetch_all':
			$res['users'] = array(array("uid" => "1", "src" => null, "name" => "Example user"));
			break;
		case 'kb_new_task':
			$res = array('error' => 'Implementation missing');
			break;
	}
	echo json_encode($res);
}