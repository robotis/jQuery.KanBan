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
if(isset($_POST['request'])) {
	echo json_encode(array('error' => 'Implementation missing: `'.$_POST['request'].'`'));
}