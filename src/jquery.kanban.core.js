/**
 * Kanban core
 * jtm@hi.is Univercity of Iceland
 * Licensed under the MIT:
 * http://www.opensource.org/licenses/mit-license.php
**/
;(function($, window, document, undefined){	
	var Kanban = function(elem, options) {
		this.elem = elem;
		this.$elem = $(elem);
		this.options = options;
		this.metadata = this.$elem.data('plugin-options');
	};
	
	$.fn.exists = function () {
	    return this.length !== 0;
	}
	$.fn.setCursorPosition = function(position){
	    if(this.lengh == 0) return this;
	    return $(this).setSelection(position, position);
	}
	$.fn.setSelection = function(selectionStart, selectionEnd) {
	    if(this.lengh == 0) return this;
	    input = this[0];

	    if (input.createTextRange) {
	        var range = input.createTextRange();
	        range.collapse(true);
	        range.moveEnd('character', selectionEnd);
	        range.moveStart('character', selectionStart);
	        range.select();
	    } else if (input.setSelectionRange) {
	        input.focus();
	        input.setSelectionRange(selectionStart, selectionEnd);
	    }

	    return this;
	}
	$.fn.focusEnd = function(){
	    this.setCursorPosition(this.val().length);
	}
	
	Kanban.prototype = {
		defaults: {
	    	main_class: 	'kanban'
	    	,board_name:	''
	    	,user_uid: 		''			// Current user
	    	,prefix:		'kb_'
			,id: 			''
			,url: 			''
			,def_user_img:	''
			,img_dir:		''
			,columns:		[]
			,prioritys:		{}
			,overlay:		{}
			,ajax_method:	'post'
			,actions: {
				new_user:		true
				,filter:		true
				,reload:		true
				,search:		true
			}
			,load:			true
			,edit_board:	true
			,edit_form:		null
			,user_form:		null
			,custom_actions: {}
			,gutter:		0
	    }
	    ,init : function() {
	    	// configuration
	    	this.config = $.extend({}, this.defaults, this.options, this.metadata);
	    	
	    	// Kanban ID
	    	if(!this.config.id) {
	    		this.config.id = this.$elem.attr('id');
				if(!this.config.id) {
					alert("No ID set, defaulting to `kanban`");
					this.$elem.attr('id', 'kanban');
					this.config.id = 'kanban';
				}
			}
	    	
	    	this.config.default_actions = {
				new_user: 	{'icon': '⊞', 'trigger': 'show_form', 'trigger_options': {'type': 'user_form'}, 'text': 'New user'}
				,filter:  	{'icon': '☰', 'trigger': 'show_form', 'trigger_options': {'type': 'filter_form'}, 'text': 'Filter'}
				,reload:	{'icon': '↺', 'trigger': 'reload'}
			};
	    	
	    	if(!this.config.width) 
	    		this.config.width = this.$elem.width();
	    	this.config.scrollbarWidth = this.scrollbarWidth();
	    	
	    	// Overlay defaults 
	    	$.extend(this.config.overlay, {
				load			: true
				,top			: 80
				,oneInstance	: false
				,closeOnClick	: false
				,closeOnEsc		: true
				,mask 			: {
					color			: '#fff'
					,loadSpeed		: 200
					,opacity		: 0.5
				}	
			});
	    	
	    	// store for repeated functions
	    	this.memoize = {};
			
			// Setup the board
			this.setup();
			
			// Connect to triggers
			this.set_events();
			
			// OK
			this.$elem.trigger('initComplete');
			if(this.config.load)
				this.$elem.trigger('reload');
	    }
	    /**
	     * Kanban setup, create kanban.
	     */
	    ,setup : function() {
	    	this.$elem.removeClass(this.config.main_class).addClass(this.config.main_class);
	    	var kanban = this;
			var header = $('<div>', {'id' : kanban.p('header'), 'class': kanban.p('row')});
			
			var title = $('<div>', {'class': kanban.p('title')});
			title.append($('<span>', {'class': kanban.p('kanban_icon icon')}).text('⥮'));
			title.append($('<div>', {'class': kanban.p('name')}).text(kanban.config.board_name));
			header.append(title);
			
			var action = kanban.config.default_actions.reload;
			action.key = 'reload';
			action.text = kanban.b(action.text);
			header.append(kanban.fill_action(action));
			if(kanban.config.actions.search) {
				var search = $('<form>', {'class' : kanban.p('header_search')});
				search.append($('<input>', {'type': 'text', 'name': 'search', 'id': kanban.p('search')}));
				search.append($('<input>', {'type': 'submit', 'value': '','class': kanban.p('header_search_submit')}));
				search.submit(function() { 
					var search = $(kanban.p('#search')).val();
					if(search) { kanban.$elem.trigger('add_filter', {'type':'search', 'val':search}); }
					return false;
				});
				header.append(search);
			}
			this.$elem.append(header);
			var actions = $('<div>', {'id' : kanban.p('actions'), 'class': kanban.p('row')});
			$.each(kanban.config.default_actions, function(i, action) {
				if(action && kanban.config.actions[i] === true && i != 'reload') {
					action.key = i;
					action.text = kanban.b(action.text);
					actions.append(kanban.fill_action(action));
				}
			});
			$.each(kanban.config.custom_actions, function(i, action) {
				if(action) {
					action.key = i;
					actions.append(kanban.fill_action(action));
				}
			});
			this.$elem.append(actions);
			
			var userlist 	= $('<div>', {'id' : kanban.p('user_list'), 'class': kanban.p('row')});
			var ur 			= $('<div>', {'class' : kanban.p('users')});
			var ul 			= $('<ul>',  {'id' : kanban.p('header_users')});
			ur.append(ul);
			userlist.append(ur);
			this.$elem.append(userlist);
			
			var filters = $('<div>', {'id': kanban.p('filters'), 'class': kanban.p('row')}).hide();
			filters.hide();
			this.$elem.append(filters);
			
			var columns = $('<div>', {'class' : kanban.p('row')});
			var colcount = kanban.config.columns.length;
			for(i=0; i<colcount; i++) {
				columns.append(kanban.fill_queue(i+1, kanban.config.columns[i]));
			}
			this.$elem.append(columns);
			this.$elem.append($('<div>', {'class' : kanban.p('overlay')}));
			kanban.resize();
		}
		,set_events : function() {
			var kanban = this;
			var elem = kanban.$elem;
			
			$.each(this.config.custom_actions, function(k, v) {
				elem.bind(k, function(e, options) {
					if(v.action) v.action(options);
				});
			});
			
			$.each(['reload', 'drop_filter', 'resize',
			        'move_task', 'drop_user', 'set_priority', 
			        'add_filter', 'new_task', 'show_form',
			        'filter_form', 'reload_users', 'reload_queue',
			        'reload_task', 'add_user', 'resolve'], function(i, b) {
				elem.bind(b, function(e, options) { 
					console.log("Trigger: " + b);
					kanban[b](options); 
				});
			});
			
			$(window).resize(function() {
				kanban.resize();
			});
		}
		 /**
		 * Resize
		 * send: 		{?}
		 * expect: 		{?}
		 * */
		,resize: function(options) {
			this.$elem.trigger('onResize');
	    	var cc = this.config.columns.length; 
	    	var margin = this.config.column_margin || 3;
	    	var uwid = this.config.width;
	    	if(uwid > $(window).width()) {
	    		uwid = $(window).width() - this.config.scrollbarWidth;
	    	}
	    	uwid -= this.config.gutter || 0; // auto-margins
	    	var width = ((uwid / cc) - margin);
	    	this.$elem.css({'width': uwid})
	    	if(this.config.gutter) 
	    		this.$elem.css('margin', this.config.gutter + 'px auto');
	    	this.$elem.find(this.p('#header')).css('width', uwid);
	    	this.$elem.find(this.p('.queue')).css(
	    			{'margin-right': margin, 'width': width}
	    	);
	    	this.$elem.find(this.p('.queue.first')).css(
	    			{'width': (width - margin), 'margin-left': margin, 'margin-right': margin}
	    	);
	    	if(width < 180) {
	    		this.$elem.find(this.p('.task .userlist')).hide();
	    	} else {
	    		this.$elem.find(this.p('.task .userlist')).show();
	    	}
	    }
		 /**
		 * Reload queue
		 * send: 		{?}
		 * expect: 		{?}
		 * */
	    ,reload_queue : function(options) {
	    	var kanban = this;
	    	var queue = $(kanban.p('#column_') + options.id);
	    	queue.empty().html($('<div>', {'class' : kanban.p('loading')}));
	    	var wid = queue.width();
	    	kanban.request({'request':'fetch_queue', 'id': options.id}, function(data) {
	    		queue.empty();
				if(data) {
					$.each(data, function(i, t) {
						queue.append(kanban.fill_task(t, wid));
					});
				}
	    	});
	    }
	    /**
		 * Reload task
		 * send: 		{?}
		 * expect: 		{?}
		 * */
	    ,reload_task : function(options) {
	    	var kanban = this;
	    	var task = $(kanban.p('#task_') + options.id);
	    	task.empty().html($('<div>', {'class' : kanban.p('loading')}));
	    	kanban.request({'request':'fetch_task', 'id': options.id}, function(data) {
	    		task.empty();
	    		kanban.fill_task_inner(task, data);
	    	});
	    }
	    /**
		 * Reload users
		 * send: 		{?}
		 * expect: 		{?}
		 * */
	    ,reload_users : function(options) {
	    	var kanban = this;
	    	var userlist = $(kanban.p('#header_users'));
	    	userlist.empty();
	    	kanban.request({'request':'fetch_users'}, function(data) {
	    		$.each(data, function(i, user) {
	    			userlist.append(kanban.fill_ul_user(user));
	    		});
	    	});
	    }
	    /**
		 * Reload everthing
		 * send: 		{?}
		 * expect: 		{?}
		 * */
		,reload : function(options) {
	    	this.$elem.trigger('onReload');
	    	var kanban 		= this;
	    	var queues 		= $(this.p('.queue_inner'));
	    	var userlist 	= $(this.p('#header_users'));
	    	var filters 	= $(this.p('#filters'));
	    	if(!options) { options = ['task', 'filter', 'user']; }
	    	if($.inArray('task', options) > -1) 
	    		queues.empty().html($('<div>', {'class' : kanban.p('loading')}));
	    	
			kanban.request({'request':'fetch_all'}, function(data) {
				if(data) {
					var colId = 1;
					if($.inArray('task', options) > -1) {
						$.each(kanban.config.columns, function() {
							var queue = $(kanban.p('#column_') + colId).empty();
							var wid = queue.width();
							if(data["column_" + colId]) {
								$.each(data["column_" + colId], function(i, t) {
									queue.append(kanban.fill_task(t, wid));
								});
							}
							colId++;
						});
					}
					if($.inArray('user', options) > -1 && data.users) {
						userlist.empty();
			    		$.each(data.users, function(i, user) {
			    			if(!kanban.current_user && user.uid === kanban.config.user_uid) {
			    				kanban.current_user = user;
			    			}
			    			userlist.append(kanban.fill_ul_user(user));
			    		});
					}
					if($.inArray('filter', options) > -1) {
						filters.empty();
						if(data.filters) {
							filters.show();
							$.each(data.filters, function(i, ft) {
								filters.append(kanban.fill_filter(ft));
							});
						} else {
							filters.hide();
						}
					}
					kanban.resize();	
				} 
			}, function(error) {
				queues.empty();
				alert(error);
			});
		}
		/**
		 * Drop filter
		 * send: 		{?}
		 * expect: 		{?}
		 * */
		,drop_filter : function(options) {
			this.$elem.trigger('onDropFilter');
			var kanban = this;
			var send = {
				'request' : 'drop_filter',
				'filter' : options.filter_id
			};
			this.request(send, function() {
				kanban.$elem.trigger('reload', [['task', 'filter']]);
			});
		}
		/**
		 * Add filter
		 * send: 		{?}
		 * expect: 		{?}
		 * */
		,add_filter : function(options) {
			this.$elem.trigger('onAddFilter');
			var kanban = this;
			var send = {
				'request' : 'filter',
				'filter' : options.val,
				'filter_type' : options.type
			};
			kanban.request(send, function(data) {
				$(kanban.p('#filters')).append(
					kanban.fill_filter({
						type: options.type, 
						val: data.val, 
						filter_id: data.filter_id
				})).show();
				kanban.$elem.trigger('reload', [['task']]);
			});
		}
		/**
		 * Show form
		 * send: 		{?}
		 * expect: 		null
		 * */
		,show_form : function(options) {
			var kanban = this;
			kanban.trigger_overlay(false, function() {
				return (kanban.config[options.type]) 
					? kanban.config[options.type](options.data)
					: kanban[options.type](options.data);
			});
		}
		/**
		 * Move task to another queue
		 * triggers: 	onNewTask
		 * send: 		{column: target queue id, value: user id}
		 * expect: 		{full task detail}
		 * */
		,new_task : function(options) {
			this.$elem.trigger('onNewTask');
			var kanban = this;
			var uid = (kanban.current_user)
				? kanban.current_user.uid
				: 'unknown';
			var send = {
				'request': 	'new_task'
				,'column': 	options.qid
				,'uid':		uid
			};
			kanban.request(send, function(data) {
				if(data) {
					$('ul#' + options.qid).prepend(
						kanban.fill_task(data)
					);
				}
			});
		}
		/**
		 * Move task to another queue
		 * triggers: 	onMove
		 * send: 		{id: task id, value: target queue id}
		 * expect: 		null
		 * */
		,move_task : function(options) {
			this.$elem.trigger('onMove');
			this.request({
				'request': 'move',
				'task': options.tid,
				'column': options.qid
			});
		}
		/**
		 * Add user to task
		 * send: 		{id: task id, value: user to add}
		 * expect: 		{full user detail}
		 * */
		,add_user : function(options) {
			var kanban = this;
			var send = {
				'request': 'add_user'
				,'task': options.tid
				,'user': options.uid
			};
			var task = $(kanban.p('#task_') + options.tid);
			kanban.request(send, function(data) {
				task.find(kanban.p('.userlist')).append(kanban.fill_user(data));
				kanban.flash(task, "#2A2");
			}, function(data) {
				kanban.flash(task, "#F00");
			});
		}
		/**
		 * Drop user from task
		 * triggers: 	onDropUser
		 * send: 		{id: task id, value: user to drop}
		 * expect: 		null
		 * */
		,drop_user : function(options) {
			this.$elem.trigger('onDropUser');
			this.request({
				'request': 'drop_user',
				'task': options.tid
			});
		}
		/**
		 * Set task priority
		 * triggers: 	onSetPriority
		 * send: 		{id: task id, value: priority to set}
		 * expect: 		{id: task id}
		 * */
		,set_priority : function(options) {
			this.$elem.trigger('onSetPriority');
			var kanban = this;
			this.request({
				'request': 	'set_priority'
				,'id': 		options.tid
				,'value': 	options.priority
			}, function(data) {
				kanban.$elem.trigger('reload_task', {id: options.tid});
			});
		}
		/**
		 * Resolve task.
		 * triggers: 	onResolve
		 * send: 		{id: task id}
		 * expect: 		{id: queue_id}
		 * */
		,resolve : function(options) {
			this.$elem.trigger('onResolve');
			var kanban = this;
			this.request({
				'request': 	'resolve'
				,'id': 		options.tid
			}, function(data) {
				kanban.$elem.trigger('reload_queue', {id: data.qid});
			});
		}
/*
 * Utility
 * */
		// Send request to server
		,request : function(send, callback, error_callback) {
			$.ajax({
				type: 		this.config.ajax_method
				,dataType: 	'JSON'
				,url: 		this.config.url
				,data: 		send
				,success: 	function(data) {
					if(data && data.error) {
						if(error_callback && typeof(error_callback) == 'function') {
							error_callback(data.error);
						} else {
							alert(data.error);
						}
					} else {
						if(callback && typeof(callback) == 'function') {
							callback(data);
						}
					}
				}
			});
		}
		,scrollbarWidth : function() {
    	    var div = $('<div style="width:50px;height:50px;overflow:hidden;position:absolute;top:-200px;left:-200px;"><div style="height:100px;"></div>');
    	    // Append our div, do our calculation and then remove it
    	    $('body').append(div);
    	    var w1 = $('div', div).innerWidth();
    	    div.css('overflow-y', 'scroll');
    	    var w2 = $('div', div).innerWidth();
    	    $(div).remove();
    	    return (w1 - w2);
    	}
		// Notify change by flashing element
		,flash : function(elem, color, duration) {
			var highlightBg = color || "#FFFF9C";
		    var animateMs = duration || 500;
		    var originalBg = elem.css("backgroundColor");
		    elem.effect("highlight", {color: highlightBg}, animateMs);
		}
		,can_edit : function(task) {
			if(task) {
				return (this.current_user.uid === task.owner);
			} 
			return (this.config.edit_board === true);
		}
		// Localization
	    ,b : function(t) {
			if(!this.babel) return t;
	    	return (typeof(this.babel[t]) == 'string') ? this.babel[t] : '!'+t+'!';
	    }
	    // Prefix class with set prefix
	    ,p : function(t) {
	    	if(this.config.prefix) {
	    		if(this.memoize[t]) 
	    			return this.memoize[t];
	    		var a = t.split(' ');
	    		for (var i = 0; i < a.length; i++) {
    			  var m = /^([\.#])?(.+)/.exec(a[i]);
    			  if (m && m[1]) {
    				  a[i] = m[1] + this.config.prefix + m[2];
    			  } else {
    				  a[i] = this.config.prefix + a[i]; 
    			  }
    			}
	    		this.memoize[t] = a.join(' ');
	    		return this.memoize[t];
	    	}
	    	return t;
	    }
	};
	
	Kanban.defaults = Kanban.prototype.defaults;

	// preventing multiple instantiations
	$.fn.kanban = function ( options ) {
		return this.each(function () {
			if (!$.data(this, 'plugin_kanban')) {
				$.data(this, 'plugin_kanban', new Kanban(this, options).init());
			}
		});
	}

	window.Kanban = Kanban;
})(jQuery, window , document);