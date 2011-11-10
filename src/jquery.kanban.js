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
	
	Kanban.prototype = {
		defaults: {
	    	main_class: 	'kanban',
	    	prefix:			"kb_",
			id: 			"",
			url: 			"",
			def_user_img:	"male-user-small.png",
			img_dir:		"",
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
	    	var action = "." + this.config.prefix + "action";
			var queue  = "." + this.config.prefix + "queue";
			var task   = "." + this.config.prefix + "task";
			var add	   = "." + this.config.prefix + "add";
    	
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
	    	
	    	if(!this.babel) {
	    		alert('No localization loaded, aborting...');
	    		return null;
	    	}
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
	    	
			$('#' + kanban.config.id + ' #' + kanban.config.prefix + 'user_form').live('submit', function() {
				var data = {};
				$(this).find(":input:not(.submit)").each(function() {
					data[$(this).attr('name')] = $(this).val();
				});
				kanban.save_user(data);
				$('#' + kanban.config.prefix + 'overlay').overlay().close();
				return false;
			});	
			
			// Setup the board
			this.setup();
			
			// Connect to triggers
			this.set_events();
	    },
	    save_task : function(task) {
			var send = {};
			var kanban = this;
			var elem = $('#' + task.tid);
			send[kanban.config.prefix + "request"] = kanban.config.prefix + "edit";
			send[kanban.config.prefix + "task"] = task.tid;
			send[kanban.config.prefix + "title"] = task.title;
			send[kanban.config.prefix + "body"] = task.body;
			send[kanban.config.prefix + "priority"] = task.priority;
			elem.empty().html($('<div>', {'class' : 'loading'}));
			kanban.request(send, function(data) {
				elem.replaceWith(kanban.fill_task(data));
				kanban.flash($('#' + data.id), "#2A2");
			}, function() {
				alert(data.error);
				elem.replaceWith(kanban.fill_task(task));
				kanban.flash($('#' + data.id), "#F00");
			});
		},
		save_user : function(task) {
			var send = {};
			var kanban = this;
			send[kanban.config.prefix + "request"] = kanban.config.prefix + "new_user";
			send[kanban.config.prefix + "user"] = task.uid;
			kanban.request(send, function(user) {
				user.src = kanban.fill_user_img(user);
				var nu = kanban.fill_user(user, kanban.config.prefix + 'user');
				nu.draggable({
					revert: 'invalid',
					helper: 'clone',
				});
				$('#' + kanban.config.prefix + 'header_users').append(nu);
			});
		},
/*
 * HTML fill functions
 * */
		fill_user : function(user, cls, draggable, click_callback) {
			var kanban = this;
			var li = cls
			 	? $('<li>', {'class' : cls})
			 	: $('<li>', {'class' : this.config.prefix + 'taskuser'});
			li.append($('<img>', {
				'class' : this.config.prefix + 'user_img',
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
					helper: 'clone',
				});
			}
			return li;
		},
		fill_user_img : function(user) {
			return (user.src)
				? this.config.img_dir + user.src
				: this.config.def_user_img;
		},
		fill_queue : function(colId, col) {
			var kanban = this;
			var cID = kanban.config.prefix + 'column_' + colId;
			var column = $('<div>', {'class' : kanban.config.prefix + "column"});
			var title = $('<h3>');
			title.append($('<span>', {'class' : kanban.config.prefix + 'icon'}).html(col.ikon));
			title.append($('<span>', {'class' : kanban.config.prefix + 'h3'}).html(col.name));
			title.append($('<span>', {'class' : kanban.config.prefix + 'icon ' + kanban.config.prefix + 'add', 
								   	  'rel' : cID}
			).html(col.add_ikon).click(function() { 
				kanban.$elem.trigger('new_task', {'qid': $(this).attr('rel')});
			}));
			column.append(title);
			
			var queue = $('<ul>', {'class' : kanban.config.prefix + 'queue', 'id' : cID});
			queue.sortable({
				connectWith: ['.' + kanban.config.prefix + 'queue']
				,items: 'li.' + kanban.config.prefix + 'task' + ':not(.ui-state-disabled)'
				,receive: function(event, ui) {
					kanban.$elem.trigger('move_task', {tid: ui.item.attr('id'), qid: $(this).attr('id')});
				}
			});
			if(colId >= kanban.config.columns.length) column.addClass('last'); 
			else if(colId == 1) column.addClass('first'); 
			column.append(queue);
			return column;
		},
	    fill_task : function(data) {
	    	var config = this.config;
	    	var kanban = this;
			var task = $('<li>', {
				'class' : config.prefix + 'task',
				'id' : data.id
			});
			if(data.type) {
				task.addClass(config.prefix + 'type_' + data.type);
			}
			var head = $('<div>', {'class' : config.prefix + 'task_head'});
			head.append(kanban.fill_priority(data.priority));
			head.append($('<span>', {'class' : config.prefix + 'task_title'}).html(data.title));
			var foot = $('<div>', {'class' : config.prefix + 'users'});
			var ul = $('<ul>', {'class' : config.prefix + 'userlist'});
			$.each(data['users'], function(i, user) {
				user.src = kanban.fill_user_img(user);
				ul.append(kanban.fill_user(user));
			});
			foot.append(ul);
			task.append(head);
			task.append(foot);
			task.droppable({ 
				hoverClass: kanban.config.prefix + 'drophover',
				accept: '.' + kanban.config.prefix + 'user',
				drop: function(e, u) {
					var task = $(this);
					var drag = u.draggable.find('img');
					var user = {
						uid : drag.attr('id'),
						src : drag.attr('src')
					};
					var send = {};
					send[config.prefix + "request"] = config.prefix + "add_user";
					send[config.prefix + "task"] = task.attr('id');
					send[config.prefix + "user"] = drag.attr('rel');
					kanban.request(send, function(data) {
						task.find('.' + kanban.config.prefix + 'userlist').append(kanban.fill_user(user));
						kanban.flash(task, "#2A2");
					}, function() {
						kanban.flash(task, "#F00");
					});
				}
			});
			task.click(function() {
				kanban.$elem.trigger('show_form', {'type': 'edit_form', 'data': data});
			});
			return task;
		},
		fill_priority : function(priority) {
			var e = this.config.prioritys[priority];
			if(!e) return null;
			var p = $('<div>', {'class' : this.config.prefix + 'task_priority'});
			if(e.color) p.css('background-color', e.color);
			if(e['class']) p.addClass(e['class']);
			return p;
		},
		fill_filter : function(filter) {
			var kanban = this;
			var div = $('<div>', {
				'class': this.config.prefix + 'filter', 
				'rel': filter.filter_id,
				'id' : this.config.prefix + 'filter_' + filter.filter_id
			});
			var btn = $('<a>', {'href': '#', 'class' : this.config.prefix + 'btn'});
			btn.append($('<span>', {'class': this.config.prefix + 'btn_icon'}).append('⊗'));
			switch (filter.type){
				case 'search': 
					btn.append($('<span>', {'class': this.config.prefix + 'btn_text'}).append(filter.val));
					break;
				case 'user':
					var img = $('<img>', {
						'class' : this.config.prefix + 'user_img',
						'src': kanban.fill_user_img(filter.val), 
						'rel': filter.val.uid,
						'title': filter.val.name
					});
					btn.append($('<span>', {'class': this.config.prefix + 'btn_text'}).append(img));
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
			var act = $('<div>', {'class' : kanban.config.prefix + 'action ' + kanban.config.prefix + action.key});
			var btn = $('<a>', {'href': '#', 'class' : kanban.config.prefix + 'btn'});
			if(action.icon) {
				btn.append($('<span>', {'class': kanban.config.prefix + 'btn_icon'}).append(action.icon));
			}
			var text = (typeof(action.text) != 'string')
				? kanban.b(action.key)
				: action.text;
			if(text) btn.append($('<span>', {'class': kanban.config.prefix + 'btn_text'}).append(text));
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
			var mdiv = $('<div>', {'class' : kanban.config.prefix + 'task_main'});
			// Header
			var header = $('<div>', {'class' : kanban.config.prefix + 'overlay_header'});
			header.append($('<h3>', {'id': kanban.config.prefix + 'overlay_title'}).click(function() {
				$(this).hide();
				$('#' + kanban.config.prefix + 'overlay_title_input').show().focus();
			}).text(task.title));
			header.append(kanban.overlay_input(kanban.config.prefix + 'overlay_title', function(from) {
				var send = {};
				send[kanban.config.prefix + 'request'] = 'edit_title';
				send[kanban.config.prefix + 'task'] = task.id;
				send[kanban.config.prefix + 'title'] = $(from).val();
				kanban.request(send, function() {
					//
				});
			}).val(task.title).hide());
			mdiv.append(header);
			// Priority
			var ps = $('<div>', {'class': kanban.config.prefix + 'prioritys'});
			var inner = $('<div>', {'class': kanban.config.prefix + 'priority'});
			inner.append($('<div>', {'class': 'show'}).css("background-color", kanban.config.prioritys[task.priority].color));
			ps.append(inner);
			mdiv.append(ps);
			// Main content
			var div = $('<div>').addClass(kanban.config.prefix + 'main');
			mdiv.append(div);
			// Sidebar
			var sidebar = $('<div>', {'class' : kanban.config.prefix + 'sidebar'});
			// Members
			var users = $('<div>', {'class' : kanban.config.prefix + 'users'});
			var ul = $('<ul>', {'class' : kanban.config.prefix + 'userlist'});
			$.each(task.users, function(i, user) {
				ul.append(kanban.fill_user(user, null, false, function() {
					kanban.$elem.trigger('drop_user', {uid: user.id, tid: task.id});
				}));
			});
			users.append(ul);
			sidebar.append(users);
			// Actions
//			var ps = $('<div>', {'class': kanban.config.prefix + 'prioritys'});
//			$.each(kanban.config.prioritys, function(i, v) {
//				var inner = $('<div>', {'class': kanban.config.prefix + 'priority'});
//				inner.append($('<div>', {'class': 'show'}).css("background-color", v.color));
//				inner.click(function() {
//					kanban.$elem.trigger('set_priority', {tid: task.id, priority: i});
//				});
//				ps.append(inner);
//			});
//			mdiv.append(ps);
//			sidebar.append(ps);
			mdiv.append(sidebar);
			return mdiv;
		},
		user_form : function() {
			var kanban = this;
			var mdiv = $('<div>', {'class' : kanban.config.prefix + 'user_main'});
			var header = $('<div>', {'class' : kanban.config.prefix + 'overlay_header'});
			header.append($('<h3>', {'class': kanban.config.prefix + 'overlay_title'}).text(kanban.b('new_user')));
			mdiv.append(header);
			var form = $('<form>', {'id' : kanban.config.prefix + 'user_form', 'method' : 'post'});
			form.append($('<label>', {'for' : 'fname', 'class' : 'flabel'}).text(kanban.b('userid')));
			form.append($('<input>', {'type' : 'text', 'name' : 'uid', 'class' : 'fkt'}));
			form.append($('<input>', {'type' : 'submit', 'value' : kanban.b('save'), 'name' : 'submit', 'class' : 'fsubmit'}));
			mdiv.append(form);
			return mdiv;
		},
		filter_form : function() {
			var kanban = this;
			var mdiv = $('<div>', {'class' : kanban.config.prefix + 'user_main'});
			var header = $('<div>', {'class' : kanban.config.prefix + 'overlay_header'});
			header.append($('<h3>', {'class': kanban.config.prefix + 'overlay_title'}).text(kanban.b('filter')));
			mdiv.append(header);
			var form = $('<form>', {'id' : kanban.config.prefix + 'user_form', 'method' : 'post'});
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
	    	var content = $('<div>', {'id' : kanban.config.prefix + 'content'});
	    	
			var header = $('<div>', {'id' : kanban.config.prefix + 'header'});
			
			$.each(kanban.config.actions, function(i, action) {
				if(action) {
					action.key = i;
					header.append(kanban.fill_action(action));
				}
			});
			
			if(kanban.config.search) {
				var search = $('<form>', {'class' : kanban.config.prefix + 'header_search'});
				search.append($('<input>', {'type': 'text', 'name': kanban.config.prefix + 'search', 'id': kanban.config.prefix + 'search'}));
				search.append($('<input>', {'type': 'submit', 'value': '','class': kanban.config.prefix + 'header_search_submit'}));
				search.submit(function() { 
					var search = $("#" + kanban.config.prefix + "search").val();
					if(search) { kanban.$elem.trigger('add_filter', {'type':'search', 'val':search}); }
					return false;
				});
				header.append(search);
			}
			
			content.append(header);
			
			var userlist = $('<div>', {'id' : kanban.config.prefix + 'user_list'});
			var ur = $('<div>', {'class' : kanban.config.prefix + 'users'});
			var ul = $('<ul>', {'id' : kanban.config.prefix + 'header_users'});
			ur.append(ul);
			userlist.append(ur);
			content.append(userlist);
			
			var filters = $('<div>', {'id':  kanban.config.prefix + 'filters'}).hide();
			filters.hide();
			content.append(filters);
			
			var columns = $('<div>', {'class' : kanban.config.prefix + "columns"});
			var colcount = kanban.config.columns.length;
			for(i=0; i<colcount; i++) {
				columns.append(kanban.fill_queue(i+1, kanban.config.columns[i]));
			}
			content.append(columns);
			content.append($('<div>', {'class' : kanban.config.prefix + 'overlay'}));
			kanban.$elem.html(content);
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
			
			$.each(['reload', 'drop_filter',
			        'move_task', 'drop_user', 'set_priority', 
			        'add_filter', 'new_task', 'show_form',
			        'new_user_form', 'filter_form'], function(i, b) {
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
		reload : function(options) {
			var send = {};
	    	var kanban = this;
	    	var queues = $('.' + kanban.config.prefix + 'queue');
	    	var userlist = $('#' + kanban.config.prefix + 'header_users');
	    	var filters = $('#' + kanban.config.prefix + 'filters');

	    	if(!options) { options = ['task', 'filter', 'user']; }
	    	if($.inArray('task', options) > -1) queues.empty().html($('<div>', {'class' : 'loading'}));
	    	
			send[kanban.config.prefix + "request"] = kanban.config.prefix + "fetch_all";
			kanban.request(send, function(data) {
				var colId = 1;
				if($.inArray('task', options) > -1) {
					$.each(kanban.config.columns, function() {
						var queue = $('#' + kanban.config.prefix + 'column_' + colId).empty();
						if(data[kanban.config.prefix + "column_" + colId]) {
							$.each(data[kanban.config.prefix + "column_" + colId], function(i, t) {
								queue.append(kanban.fill_task(t));
							});
						}
						colId++;
					});
				}
				if($.inArray('user', options) > -1 && data.users) {
					userlist.empty();
					$.each(data.users, function(i, user) {
						user.src = kanban.fill_user_img(user);
						userlist.append(kanban.fill_user(user, kanban.config.prefix + 'user', true, function() {
							var user = $(this).find('img').attr('rel');
							kanban.$elem.trigger('add_filter', {type: 'user', 'val': user});
						}));
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
//		filter_form : function(options) {
//			this.$elem.trigger('show_form', {'type':'filter_form','data':options});
//		},
		drop_filter : function(options) {
			var kanban = this;
			var send = {};
			send[this.config.prefix + "request"] = this.config.prefix + "drop_filter";
			send[this.config.prefix + "filter"] = options.filter_id;
			this.request(send, function() {
				kanban.$elem.trigger('reload', [['task', 'filter']]);
			});
		},
		add_filter : function(options) {
			var kanban = this;
			var send = {};
			send[kanban.config.prefix + "request"] = kanban.config.prefix + "filter";
			send[kanban.config.prefix + "filter"] = options.val;
			send[kanban.config.prefix + "filter_type"] = options.type;
			kanban.request(send, function(data) {
				$('#' + kanban.config.prefix + 'filters').append(
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
			var kanban = this;
			var send = {};
			send[kanban.config.prefix + "request"] = kanban.config.prefix + "new";
			send[kanban.config.prefix + "column"] = options.qid;
			kanban.request(send, function(data) {
				$('ul#' + options.qid).append(
					kanban.fill_task(data)
				);
			});
		},
//		new_user_form : function(options) {
//			this.$elem.trigger('show_form', {'type':'user_form','data':options});
//		},
		move_task : function(options) {
			var send = {};
			send[this.config.prefix + "request"] = this.config.prefix + "move";
			send[this.config.prefix + "task"] = options.tid;
			send[this.config.prefix + "column"] = options.qid;
			this.request(send, null);
		},
		drop_user : function(options) {
			// FIXME
		},
		set_priority : function() {
			// FIXME
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
				var id = kanban.config.prefix + "overlay";
				var odiv = $('<div>', {'id' : id, 'class': 'overlay_box'});
				var ocontent = $('<div>', {'class': 'overlay_box_content'});
				var ohead = $('<div>', {'class': 'overlay_box_head'});
				
				var clId = id + '_close';
				ohead.append($('<span>', {'id' : clId}));
				
				ocontent.append(ohead);
				var content = $('<div>', {'class' : 'overlay_content'});
				
				content.html(callback(data));
				ocontent.append(content);
				odiv.append(ocontent);
				$('.' + id).html(odiv);
				
				kanban.config.overlay.close = $('#' + clId);
				$('#' + id).overlay(kanban.config.overlay).load();
			}
			if(send) {
				kanban.request(send, function(data) {
					overlay(data);
				});
			} else {
				overlay(null);
			}
		},
		overlay_input : function(id, on_enter, type) {
			var t = type ? type : '<input>';
			var input = $(t, {'id': id + '_input'}).keydown(function(e) {
				if(e.keyCode === 13) {
					on_enter(this);
				} else if(e.keyCode !== 27) {
					// Propagate
					return true;
				} 
				$(this).hide();
				$('#' + id).show();
				e.stopImmediatePropagation();
				return false;
			});
			return input;
		},
		flash : function(elem, color, duration) {
			var highlightBg = color || "#FFFF9C";
		    var animateMs = duration || 500;
		    var originalBg = elem.css("backgroundColor");
		    elem.effect("highlight", {color: highlightBg}, animateMs);
		},
	    resize: function() {
	    	var cc = this.config.columns.length; 
	    	var margin = this.config.column_margin || 3;
	    	var uwid = this.config.width;
	    	if(uwid > $(window).width()) {
	    		uwid = $(window).width() - this.config.scrollbarWidth;
	    	}
	    	var width = ((uwid / cc) - margin);
	    	this.$elem.css('width', uwid);
	    	this.$elem.find('#' + this.config.prefix + 'header').css('width', uwid);
	    	this.$elem.find('.' + this.config.prefix + 'column').css(
	    			{'margin-right': margin, 'width': width}
	    	);
	    	this.$elem.find('.' + this.config.prefix + 'column.first').css(
	    			{'width': (width - margin), 'margin-left': margin, 'margin-right': margin}
	    	);
	    	if(width < 180) {
	    		this.$elem.find('.' + this.config.prefix + 'task .' + this.config.prefix + 'userlist').hide();
	    	} else {
	    		this.$elem.find('.' + this.config.prefix + 'task .' + this.config.prefix + 'userlist').show();
	    	}
	    },
	    b : function(t) {
	    	return (typeof(this.babel[t]) == 'string') ? this.babel[t] : '!'+t+'!';
	    },
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