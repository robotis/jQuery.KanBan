/*
 * JQuery KanBan plugin.
 * Dual licensed under the MIT and GPL licenses
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl-2.0.html
 * <jtm@hi.is>
 * */
;(function($, window, document, undefined){	
	var Kanban = function(elem, options){
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
	    	main_class: 	'kanban',
	    	prefix:			'kb_',
			id: 			'',
			url: 			'',
			def_user_img:	'',
			img_dir:		'',
			columns:		[],
			prioritys:		{},
			overlay:		{},
			ajax_method:	'post',
			actions:		{
				new_user:		{'icon': '⊞', 'trigger': 'show_form', 'trigger_options': {'type': 'user_form'}},
				filter:			{'icon': '☰', 'trigger': 'show_form', 'trigger_options': {'type': 'filter_form'}},
				reload:			{'icon': '↺', 'trigger': 'reload'}
			},
			custom_actions: {},
			search:			true,
			edit_form:		null,
			user_form:		null,
	    },
	    init : function() {
	    	this.config = $.extend({}, this.defaults, this.options, this.metadata);
	    	var kanban = this;
	    	var action = this.p('.action');
			var queue  = this.p('.queue');
			var task   = this.p('.task');
			var add	   = this.p('.add');
    	
	    	if(!this.config.id) {
	    		this.config.id = this.$elem.attr('id');
				if(!this.config.id) {
					alert("No ID set, defaulting to `kanban`");
					this.$elem.attr('id', 'kanban');
					this.config.id = 'kanban';
				}
			}
	    	
	    	if(!this.config.width) this.config.width = this.$elem.width();
	    	function scrollbarWidth() {
	    	    var div = $('<div style="width:50px;height:50px;overflow:hidden;position:absolute;top:-200px;left:-200px;"><div style="height:100px;"></div>');
	    	    // Append our div, do our calculation and then remove it
	    	    $('body').append(div);
	    	    var w1 = $('div', div).innerWidth();
	    	    div.css('overflow-y', 'scroll');
	    	    var w2 = $('div', div).innerWidth();
	    	    $(div).remove();
	    	    return (w1 - w2);
	    	}
	    	this.config.scrollbarWidth = scrollbarWidth();
	    	
	    	$.extend(this.config.actions, this.config.custom_actions);
	    	// Overlay defaults 
	    	$.extend(this.config.overlay, {
				load			: true,
				top				: 80,
				oneInstance		: false,
				closeOnClick	: false,
				closeOnEsc		: true,
				mask 			: {
					color			: '#fff',
					loadSpeed		: 200,
					opacity			: 0.5
				}	
			});
			
			// Setup the board
			this.setup();
			
			// Connect to triggers
			this.set_events();
			
			// OK
			this.$elem.trigger('initComplete');
	    },
/*
 * HTML fill functions
 * */
		fill_user : function(user, cls, draggable, click_callback) {
			var kanban = this;
			var li = cls
			 	? $('<li>', {'class' : cls})
			 	: $('<li>', {'class' : this.p('taskuser')});
			li.append($('<img>', {
				'class' : this.p('user_img'),
				'src': user.src, 
				'rel': user.uid,
				'title': user.name
			}));
			if(click_callback) {
				li.click(click_callback);
			}
			if(draggable) {
				li.draggable({
					revert: 'invalid',
					helper: 'clone'
				});
			}
			return li;
		},
		fill_ul_user : function(user) {
	    	var kanban = this;
			user.src = kanban.fill_user_img(user);
			var elm = kanban.fill_user(user, kanban.p('user'), true, function() {
				var user = $(this).find('img').attr('rel');
				kanban.$elem.trigger('add_filter', {type: 'user', 'val': user});
			});
			elm.mousedown(function(e) {
				if(e.which === 3) {
					// Edit user
					return false;
				}
			}).bind('contextmenu', function(e) {
				// Disable right-click menu
			    return false;
			});
			return elm;
	    },
		fill_user_img : function(user) {
			return (user.src)
				? this.config.img_dir + user.src
				: this.config.def_user_img;
		},
		fill_queue : function(colId, col) {
			var kanban = this;
			var cID = kanban.p('column_') + colId;
			var column = $('<div>', {'class' : kanban.p('column queue')});
			var title = $('<h3>');
			title.append($('<span>', {'class' : kanban.p('icon')}).html(col.ikon));
			title.append($('<span>', {'class' : kanban.p('h3')}).html(col.name));
			title.append($('<span>', {'class' : kanban.p('icon add clickable'), 
								   	  'rel' : cID, 'title': kanban.b('Create new task in this queue')}
			).html(col.add_ikon).click(function() { 
				kanban.$elem.trigger('new_task', {'qid': $(this).attr('rel')});
			}));
			column.append(title);
			
			var queue = $('<ul>', {'class' : kanban.p('queue_inner'), 'id' : cID});
			queue.sortable({
				connectWith: [kanban.p('.queue_inner')]
				,items: 'li.' + kanban.p('task') + ':not(.ui-state-disabled)'
				,receive: function(event, ui) {
					kanban.$elem.trigger('move_task', {tid: ui.item.attr('id'), qid: $(this).attr('id')});
				}
			});
			if(colId >= kanban.config.columns.length) column.addClass('last'); 
			else if(colId == 1) column.addClass('first'); 
			column.append(queue);
			return column;
		},
		fill_task_inner : function(task, data) {
			var kanban = this;
			var head = $('<div>', {'class' : kanban.p('task_head')});
			head.append(kanban.fill_priority(data.priority));
			head.append($('<span>', {'class' : kanban.p('task_title')}).html(data.title));
			var foot = $('<div>', {'class' : kanban.p('users')});
			var ul = $('<ul>', {'class' : kanban.p('userlist')});
			$.each(data['users'], function(i, user) {
				user.src = kanban.fill_user_img(user);
				if(i < 6) {
					ul.append(kanban.fill_user(user));
				}
			});
			foot.append(ul);
			task.append(head);
			task.append(foot);
		},
	    fill_task : function(data) {
	    	var config = this.config;
	    	var kanban = this;
			var task = $('<li>', {
				'class' : kanban.p('task'),
				'id' : data.id
			});
			if(data.type) {
				task.addClass(kanban.p('type_') + data.type);
			}
			kanban.fill_task_inner(task, data);
			task.droppable({ 
				hoverClass: kanban.p('drophover'),
				accept: kanban.p('.user'),
				drop: function(e, u) {
					var task = $(this);
					var drag = u.draggable.find('img');
					var user = {
						uid : drag.attr('id'),
						src : drag.attr('src')
					};
					var send = {};
					send['request'] = 'add_user';
					send['task'] = task.attr('id');
					send['user'] = drag.attr('rel');
					kanban.request(send, function(data) {
						task.find(kanban.p('.userlist')).append(kanban.fill_user(user));
						kanban.flash(task, "#2A2");
					}, function() {
						kanban.flash(task, "#F00");
					});
				}
			});
			task.click(function() {
				var send = {
					'request': 'fetch_task',
					'id': data.id
				};
				kanban.request(send, function(t) {
					$.each(t['users'], function(i, user) {
						user.src = kanban.fill_user_img(user);
					});
					kanban.$elem.trigger('show_form', {'type': 'edit_form', 'data': t});
				});
			});
			return task;
		},
		fill_priority : function(priority) {
			var e = this.config.prioritys[priority];
			if(!e) return null;
			var p = $('<div>', {'class' : this.p('task_priority')});
			if(e.color) p.css('background-color', e.color);
			if(e['class']) p.addClass(e['class']);
			return p;
		},
		fill_filter : function(filter) {
			var kanban = this;
			var div = $('<div>', {
				'class': kanban.p('filter'), 
				'rel': filter.filter_id,
				'id' : kanban.p('filter_') + filter.filter_id
			});
			var btn = $('<a>', {'href': '#', 'class' : kanban.p('btn')});
			btn.append($('<span>', {'class': kanban.p('btn_icon')}).append('⊗'));
			switch (filter.type){
				case 'search': 
					btn.append($('<span>', {'class': kanban.p('btn_text')}).append(filter.val));
					break;
				case 'user':
					var img = $('<img>', {
						'class' : kanban.p('user_img'),
						'src': kanban.fill_user_img(filter.val), 
						'rel': filter.val.uid,
						'title': filter.val.name
					});
					btn.append($('<span>', {'class': kanban.p('btn_text')}).append(img));
					break;
			}
			div.append(btn);
			div.click(function() {
				kanban.$elem.trigger('drop_filter', {filter_id: $(this).attr('rel')});
			});
			return div;
		},
		fill_action : function(action) {
			var kanban = this;
			var act = $('<div>', {'class' : kanban.p('action') + ' ' + kanban.p(action.key)});
			var btn = $('<a>', {'href': '#', 'class' : kanban.p('btn')});
			if(action.icon) {
				btn.append($('<span>', {'class': kanban.p('btn_icon')}).append(action.icon));
			}
			var text = (typeof(action.text) != 'string')
				? kanban.b(action.key)
				: action.text;
			if(text) btn.append($('<span>', {'class': kanban.p('btn_text')}).append(text));
			act.append(btn);
			act.click(function() { 
				if(action.trigger) {
					kanban.$elem.trigger(action.trigger, action.trigger_options); 
				} else if(action.action) {
					action.action();
				}
			});
			return act;
		},
/*
 * Forms
 * */
		edit_form : function(task) {
			var kanban = this;
			var mdiv = $('<div>', {'class' : kanban.p('task_main')});
			// Header
			var header = $('<div>', {'class' : kanban.p('overlay_header')});
			header.append(kanban.overlay_input(
				$('<h3>', {'id': kanban.p('set_title'), rel: task.id}).text(task.title), task.title, 
					function(from) {
						var val = $(from).val();
						var send = {
							'request': 'set_title',
							'id': task.id,
							'value': val
						};
						kanban.request(send, function() {
							kanban.$elem.trigger('reload_task', {id: task.id});
							$(kanban.p('#set_title')).text(val);
						});
					}
				)
			);
			
			mdiv.append(header);
			// Priority
			var ps = $('<div>', {'class': kanban.p('prioritys_current')});
			var inner = $('<div>', {'class': kanban.p('priority')});
			inner.append($('<div>', {'class': 'show', 'id': kanban.p('current_priority')})
						.css("background-color", kanban.config.prioritys[task.priority].color));
			ps.append(inner);
			mdiv.append(ps);
			// Main content
			var div = $('<div>').addClass(kanban.p('main'));
			div.append($('<div>').addClass(kanban.p('separator')).text(kanban.b('Description')));
			div.append($('<hr>'));
			var desc = task.body ? task.body : kanban.b('Add description');
			div.append(kanban.overlay_input(
				$('<a>', {'id': kanban.p('add_description'), rel: task.id}).text(desc), desc, 
					function(from) {					
						var send = {
							'request': 'add_description',
							'id': task.id,
							'value': $(from).val()
						};
						kanban.request(send, null);
					}, 
				    '<textarea>'
				)
			);
			div.append($('<div>').addClass(kanban.p('separator')).text(kanban.b('Comments')));
			div.append($('<hr>'));
			div.append(kanban.overlay_input(
				$('<a>', {'id': kanban.p('add_comment'), rel: task.id}).text(kanban.b('Add comment')), '', 
					function(from) {					
						var send = {
							'request': 'add_comment',
							'id': task.id,
							'value': $(from).val()
						};
						kanban.request(send, null);
					}, 
				    '<textarea>'
				)
			);
			
			mdiv.append(div);
			// Sidebar
			var sidebar = $('<div>', {'class' : kanban.p('sidebar')});
			// Members
			sidebar.append($('<div>').addClass(kanban.p('separator')).text(kanban.b('Members')));
			sidebar.append($('<hr>'));
			var users = $('<div>', {'class' : kanban.p('users')});
			var ul = $('<ul>', {'class' : kanban.p('userlist')});
			$.each(task.users, function(i, user) {
				ul.append(kanban.fill_user(user, null, false, function() {
					kanban.$elem.trigger('drop_user', {uid: user.id, tid: task.id});
				}));
			});
			users.append(ul);
			sidebar.append(users);
			// Members
			sidebar.append($('<hr>'));
			sidebar.append(kanban.fill_action({'key': 'set_priority', 'icon': '◱', 'action': function() {
				$(kanban.p('.prioritys')).toggle();
			}, 'text': kanban.b('Set priority')}));
			var ps = $('<div>', {'class': kanban.p('prioritys')});
			$.each(kanban.config.prioritys, function(i, v) {
				var inner = $('<div>', {'class': kanban.p('priority'), 'rel': v.color});
				inner.append($('<div>', {'class': 'show'}).css("background-color", v.color));
				inner.click(function() {
					var color = $(this).attr("rel");
					$(kanban.p('#current_priority')).css("background-color", color);
					kanban.$elem.trigger('set_priority', {tid: task.id, priority: i});
				});
				ps.append(inner);
			});
			sidebar.append(ps.hide());
			sidebar.append(kanban.fill_action({'key': 'archive', 'icon': '◧', 'text': kanban.b('Archive')}));
			mdiv.append(sidebar);
			return mdiv;
		},
		user_form : function() {
			var kanban = this;
			var mdiv = $('<div>', {'class' : kanban.p('user_main')}); 
			var header = $('<div>', {'class' : kanban.p('overlay_header')});
			header.append($('<h3>', {'class': kanban.p('overlay_title')}).text(kanban.b('New user')));
			mdiv.append(header);
			
			var form = $('<div>').addClass(kanban.p('main'));
			form.append($('<label>', {'for' : 'fname', 'class' : 'flabel'}).text(kanban.b('User ID')));
			var input = $('<input>', {'id':  kanban.p('uid_input')}).keydown(function(e) {
				if(e.keyCode === 13) {
					var t = $(this);
					var send = {
						'request': 'new_user',
						'user': t.val()
					};
					kanban.request(send, function(user) {
						$(kanban.p('#header_users')).append(kanban.fill_ul_user(user));
					});
					t.val('');
					kanban.flash(mdiv, '#0F0');
				} 
				// Propagate
				return true;
			});
			form.append(input);
			mdiv.append(form);
			return mdiv;
		},
		filter_form : function() {
			var kanban = this;
			var mdiv = $('<div>', {'class' : kanban.p('user_main')});
			var header = $('<div>', {'class' : kanban.p('overlay_header')});
			header.append($('<h3>', {'class': kanban.p('overlay_title')}).text(kanban.b('Filter')));
			mdiv.append(header);
			var form = $('<form>', {'id' : kanban.p('user_form'), 'method' : 'post'});
			// FORM HERE
			mdiv.append(form);
			return mdiv;
		},
/*
 * Setup
 * */
	    setup : function() {
	    	this.$elem.removeClass(this.config.main_class).addClass(this.config.main_class);
	    	var kanban = this;
			var header = $('<div>', {'id' : kanban.p('header'), 'class': kanban.p('row')});
			
			$.each(kanban.config.actions, function(i, action) {
				if(action) {
					action.key = i;
					header.append(kanban.fill_action(action));
				}
			});
			
			if(kanban.config.search) {
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
		},
		set_events : function() {
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
			        'reload_task'], function(i, b) {
				elem.bind(b, function(e, options) { 
					console.log("Trigger: " + b);
					kanban[b](options); 
				});
			});
			
			$(window).resize(function() {
				kanban.resize();
			});
		},
/**
 * Triggers
 */
		resize: function(options) {
			this.$elem.trigger('onResize');
	    	var cc = this.config.columns.length; 
	    	var margin = this.config.column_margin || 3;
	    	var uwid = this.config.width;
	    	if(uwid > $(window).width()) {
	    		uwid = $(window).width() - this.config.scrollbarWidth;
	    	}
	    	uwid -= 10; // auto-margins
	    	var width = ((uwid / cc) - margin);
	    	this.$elem.css({'width': uwid, 'margin': '5px auto'});
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
	    },
	    reload_queue : function(options) {
	    	var kanban = this;
	    	var queue = $(kanban.p('#column_') + options.id);
	    	queue.empty().html($('<div>', {'class' : kanban.p('loading')}));
	    	kanban.request({'request':'fetch_queue', 'id': options.id}, function(data) {
	    		queue.empty();
				if(data) {
					$.each(data, function(i, t) {
						queue.append(kanban.fill_task(t));
					});
				}
	    	});
	    },
	    reload_task : function(options) {
	    	var kanban = this;
	    	var task = $('#' + options.id);
	    	task.empty().html($('<div>', {'class' : kanban.p('loading')}));
	    	kanban.request({'request':'fetch_task', 'id': options.id}, function(data) {
	    		task.empty();
	    		kanban.fill_task_inner(task, data);
	    	});
	    },
	    reload_users : function(options) {
	    	var kanban = this;
	    	var userlist = $(kanban.p('#header_users'));
	    	userlist.empty();
	    	kanban.request({'request':'fetch_users'}, function(data) {
	    		$.each(data, function(i, user) {
	    			userlist.append(kanban.fill_ul_user(user));
	    		});
	    	});
	    },
		reload : function(options) {
	    	this.$elem.trigger('onReload');
	    	var kanban 		= this;
	    	var queues 		= $(this.p('.queue_inner'));
	    	var userlist 	= $(this.p('#header_users'));
	    	var filters 	= $(this.p('#filters'));
	    	if(!options) { options = ['task', 'filter', 'user']; }
	    	if($.inArray('task', options) > -1) 
	    		queues.empty().html($('<div>', {'class' : kanban.p('loading')}));
	    	
			kanban.request({'request':'fetch_all'}, function(data) {
				var colId = 1;
				if($.inArray('task', options) > -1) {
					$.each(kanban.config.columns, function() {
						var queue = $(kanban.p('#column_') + colId).empty();
						if(data["column_" + colId]) {
							$.each(data["column_" + colId], function(i, t) {
								queue.append(kanban.fill_task(t));
							});
						}
						colId++;
					});
				}
				if($.inArray('user', options) > -1 && data.users) {
					userlist.empty();
		    		$.each(data.users, function(i, user) {
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
			});
		},
		drop_filter : function(options) {
			this.$elem.trigger('onDropFilter');
			var kanban = this;
			var send = {
				'request' : 'drop_filter',
				'filter' : options.filter_id
			};
			this.request(send, function() {
				kanban.$elem.trigger('reload', [['task', 'filter']]);
			});
		},
		add_filter : function(options) {
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
		},
		show_form : function(options) {
			var kanban = this;
			kanban.trigger_overlay(false, function() {
				return (kanban.config[options.type]) 
					? kanban.config[options.type](options.data)
					: kanban[options.type](options.data);
			});
		},
		new_task : function(options) {
			this.$elem.trigger('onNewTask');
			var kanban = this;
			var send = {
				'request': 'new_task',
				'column': options.qid
			};
			kanban.request(send, function(data) {
				$('ul#' + options.qid).append(
					kanban.fill_task(data)
				);
			});
		},
		move_task : function(options) {
			this.$elem.trigger('onMove');
			this.request({
				'request': 'move',
				'task': options.tid,
				'column': options.qid
			});
		},
		drop_user : function(options) {
			this.$elem.trigger('onDropUser');
			this.request({
				'request': 'drop_user',
				'task': options.tid
			});
		},
		set_priority : function(options) {
			this.$elem.trigger('onSetPriority');
			var kanban = this;
			this.request({
				'request': 'set_priority',
				'id': options.tid,
				'value': options.priority
			}, function(data) {
				kanban.$elem.trigger('reload_task', {id: options.tid});
			});
		},
/*
 * Utility
 * */
		request : function(send, callback, error_callback) {
			$.ajax({
				type: this.config.ajax_method,
				dataType: 'JSON', 
				url: this.config.url, 
				data : send, 
				success : function(data) {
					if(data && data.error) {
						if(error_callback && typeof(error_callback) == 'function') 
							error_callback(data.error);
						else 
							alert(data.error);
					} else {
						if(callback && typeof(callback) == 'function') 
							callback(data);
					}
				}
			});
		},
		trigger_overlay : function(send, callback) {
			var kanban = this;
			function overlay(data) {
				var id = kanban.p("overlay");
				var ol = $('.' + id);
				var odiv = $('<div>', {'id' : id, 'class': kanban.p('overlay_box')});
				var ocontent = $('<div>', {'class': kanban.p('overlay_box_content')});
				var ohead = $('<div>', {'class': kanban.p('overlay_box_head')});
				
				var clId = id + '_close';
				ohead.append($('<span>', {'id' : clId}));
				
				ocontent.append(ohead);
				var content = $('<div>', {'class' : kanban.p('overlay_content')});
				content.html(callback(data));
				ocontent.append(content);
				odiv.append(ocontent);
				ol.html(odiv);
				
				kanban.config.overlay.close = $('#' + clId);
				$('#' + id).overlay(kanban.config.overlay).bind('onClose', function() {
					ol.empty();
				}).load();
			}
			if(send) {
				kanban.request(send, function(data) {
					overlay(data);
				});
			} else {
				overlay(null);
			}
		},
		overlay_input : function(elem, text, on_enter, type) {
			var kanban = this;
			var id = elem.attr('id');
			elem.click(function() {
				// Show other input overs
				$(kanban.p('.overlay_input')).show();
				$(this).hide();
				
				// Hide other input forms
				$(kanban.p('.overlay_form')).hide();
				$('#' + id + '_form').show();
				$('#' + id + '_input').focusEnd();
			}).addClass(kanban.p('overlay_input'));
			var form = $('<div>', {'id': id + '_form'}).addClass(this.p('overlay_form'));
			var t = type ? type : '<input>';
			var input = $(t, {'id': id + '_input'}).keydown(function(e) {
				if(e.keyCode === 13) {
					if(on_enter) on_enter(this);
				} else if(e.keyCode !== 27) {
					// Propagate
					return true;
				} 
				$('#' + id + '_form').hide();
				$('#' + id).show();
				e.stopImmediatePropagation();
				return false;
			}).addClass(this.p('overlay_inner_input'));
			if(text) input.val(text);
			var wrap = $('<div>');
			wrap.append(elem);
			form.append(input);
//			form.append($('<span class="kb_icon kb_overlay_save" rel="kb_column_2">+</span>'));
			form.hide();
			wrap.append(form);
			return wrap;
		},
		flash : function(elem, color, duration) {
			var highlightBg = color || "#FFFF9C";
		    var animateMs = duration || 500;
		    var originalBg = elem.css("backgroundColor");
		    elem.effect("highlight", {color: highlightBg}, animateMs);
		},
	    b : function(t) {
			if(!this.babel) return t;
	    	return (typeof(this.babel[t]) == 'string') ? this.babel[t] : '!'+t+'!';
	    },
	    p : function(t) {
	    	if(this.config.prefix) {
	    		var a = t.split(' ');
	    		for (var i = 0; i < a.length; i++) {
    			  var m = /^([\.#])?(.+)/.exec(a[i]);
    			  if (m && m[1]) {
    				  a[i] = m[1] + this.config.prefix + m[2];
    			  } else {
    				  a[i] = this.config.prefix + a[i]; 
    			  }
    			}
	    		return a.join(' ');
	    	}
	    	return t;
	    }
	};
	
	Kanban.defaults = Kanban.prototype.defaults;

	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn.kanban = function ( options ) {
		return this.each(function () {
			if (!$.data(this, 'plugin_kanban')) {
				$.data(this, 'plugin_kanban', new Kanban(this, options).init());
				$(this).trigger('reload');
			}
		});
	}

	window.Kanban = Kanban;
})(jQuery, window , document);