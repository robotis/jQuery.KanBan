/**
 * Kanban HTML Fill functions
 * jtm@hi.is Univercity of Iceland
 * Licensed under the MIT:
 * http://www.opensource.org/licenses/mit-license.php
**/
;(function($){
	$.extend(Kanban.prototype, {	
		/*
		 * HTML fill functions
		 * */
		fill_user : function(user, cls, draggable, click_callback) {
			var kanban = this;
			var li = cls
			 	? $('<li>', {'class' : cls})
			 	: $('<li>', {'class' : this.p('taskuser')});
			li.append($('<img>', {
				'class': 	this.p('user_img')
				,'src': 	kanban.fill_user_img(user) 
				,'rel': 	user.uid
				,'title': 	user.name
			}));
			if(click_callback) {
				li.click(click_callback);
			}
			if(this.can_edit() && draggable) {
				li.draggable({
					revert: 	'invalid'
					,helper: 	'clone'
				});
			}
			return li;
		}
		,fill_ul_user : function(user) {
	    	var kanban = this;
			var elm = kanban.fill_user(user, kanban.p('user'), true, function() {
				var user = $(this).find('img').attr('rel');
				var send = {
					'request': 	'fetch_task'
					,'id':		user
				};
				kanban.request(send, function(data) {
					kanban.$elem.trigger('show_form', {'type': 'edit_user_form', 'data': data});
				});
			});
			elm.mousedown(function(e) {
				if(e.which === 3) {
					var user = $(this).find('img').attr('rel');
					kanban.$elem.trigger('add_filter', {type: 'user', 'val': user});
					return false;
				}
			}).bind('contextmenu', function(e) {
				// Disable right-click menu
			    return false;
			});
			return elm;
	    }
		,fill_user_img : function(user) {
			return (user && user.src)
				? this.config.img_dir + user.src
				: this.config.def_user_img;
		}
		,fill_queue : function(colId, col) {
			var kanban = this;
			var cID = kanban.p('column_') + colId;
			var column = $('<div>', {'class' : kanban.p('column queue')});
			var title = $('<h3>');
			title.append($('<span>', {'class' : kanban.p('icon')}).html(col.icon));
			title.append($('<span>', {'class' : kanban.p('h3')}).html(col.name));
			if(this.can_edit()) {
				title.append($('<span>', {'class' : kanban.p('icon add clickable'), 
								   	  	  'rel' : cID, 'title': kanban.b('Create new task in this queue')}
				).html(col.add_icon).click(function() { 
					kanban.$elem.trigger('new_task', {'qid': $(this).attr('rel')});
				}));
			}
			column.append(title);
			
			var queue = $('<ul>', {'class' : kanban.p('queue_inner'), 'id' : cID});
			if(this.can_edit()) {
				queue.sortable({
					connectWith: [kanban.p('.queue_inner')]
					,items: 'li.' + kanban.p('task') + ':not(.ui-state-disabled)'
					,receive: function(event, ui) {
						kanban.$elem.trigger('move_task', {tid: ui.item.attr('rel'), qid: $(this).attr('id')});
					}
				});
			}
			if(colId >= kanban.config.columns.length) column.addClass('last'); 
			else if(colId == 1) column.addClass('first'); 
			column.append(queue);
			return column;
		}
		,fill_task_inner : function(task, data) {
			var kanban = this;
			var head = $('<div>', {'class' : kanban.p('task_head')});
			head.append(kanban.fill_priority(data.priority));
			head.append($('<span>', {'class' : kanban.p('task_title')}).html(data.title));
			var foot = $('<div>', {'class' : kanban.p('users')});
			if(data.users) {
				var ul = $('<ul>', {'class' : kanban.p('userlist')});
				$.each(data['users'], function(i, user) {
					if(i < 5) {
						ul.append(kanban.fill_user(user));
					}
				});
				foot.append(ul);
			}
			task.append(head);
			task.append(foot);
		}
	    ,fill_task : function(data, qwid) {
	    	var config = this.config;
	    	var kanban = this;
			var task = $('<li>', {
				'class' : kanban.p('task')
				,'id' : kanban.p('task') + '_' + data.id
				,'rel': data.id
			});
			if(data.type) {
				task.addClass(kanban.p('type_') + data.type);
			}
			kanban.fill_task_inner(task, data);
			if(this.can_edit()) {
				task.droppable({ 
					hoverClass: kanban.p('drophover')
					,accept: kanban.p('.user')
					,drop: function(e, u) {
						var uid = u.draggable.find('img').attr('rel');
						kanban.$elem.trigger('add_user', {'uid': uid, 'tid': data.id});
					}
				});
			}
			task.click(function() {
				var send = {
					'request': 	'fetch_task'
					,'id':		data.id
				};
				kanban.request(send, function(t) {
					kanban.$elem.trigger('show_form', {'type': 'edit_form', 'data': t});
				});
			});
			if(qwid < 180) task.find(kanban.p('.userlist')).hide();
			return task;
		}
		,fill_priority : function(priority, cls) {
			var e = this.config.prioritys[priority];
			var p = (cls) 
				? $('<div>', {'class' : cls})
				: $('<div>', {'class' : this.p('task_priority')});
			if(e && e.color) p.css('background-color', e.color);
			if(e && e['class']) p.addClass(e['class']);
			return p;
		}
		,fill_filter : function(filter) {
			var kanban = this;
			var div = $('<div>', {
				'class': 	kanban.p('filter')
				,'rel': 	filter.filter_id
				,'id' : 	kanban.p('filter_') + filter.filter_id
			});
			var btn = $('<a>', {'href': '#', 'class' : kanban.p('btn')});
			btn.append($('<span>', {'class': kanban.p('btn_icon')}).append('⊗'));
			switch (filter.type){
				case 'search': 
					btn.append($('<span>', {'class': kanban.p('btn_text')}).append(filter.val));
					break;
				case 'user':
					var img = $('<img>', {
						'class' : 	kanban.p('user_img')
						,'src': 	kanban.fill_user_img(filter.val)
						,'rel': 	filter.val.uid
						,'title': 	filter.val.name
					});
					btn.append($('<span>', {'class': kanban.p('btn_text')}).append(img));
					break;
				default:
					if(filter.name)
						btn.append($('<span>', {'class': kanban.p('btn_text')}).append(filter.name));
					break;
			}
			div.append(btn);
			div.click(function() {
				kanban.$elem.trigger('drop_filter', {filter_id: $(this).attr('rel')});
			});
			return div;
		}
		,fill_action : function(action) {
			var kanban = this;
			var act = $('<div>', {'class' : kanban.p('action clickable ' + action.key)});
			var btn = $('<a>', {'class' : kanban.p('btn')});
			if(action.link) btn.attr('href', action.link);
			if(action.icon) {
				btn.append($('<span>', {'class': kanban.p('btn_icon')}).append(action.icon));
			}
			if(action.url) {
				btn.append($('<span>', {'class': kanban.p('btn_text')}).append(action.url));
			} else {
				var text = (typeof(action.text) != 'string')
					? kanban.b(action.key)
					: action.text;
				if(text) btn.append($('<span>', {'class': kanban.p('btn_text')}).append(text));
			}
			act.append(btn);
			act.click(function() { 
				if(action.trigger) {
					kanban.$elem.trigger(action.trigger, action.trigger_options); 
				} else if(action.action) {
					action.action();
				}
			});
			return act;
		}
		,fill_comment : function(data) {
			var li = this.fill_user(this.current_user, this.p('comment'));
			li.append($('<div>').addClass(this.p('comment_body')).text(data.body));
			return li;
		}
		,fill_tag : function(tag, tid) {
			var kanban = this;
			var tag = $('<a>', {'class': this.p('task_tag clickable'), 'rel': tid}).text(tag);
			tag.click(function () {
				var t = $(this);
				kanban.$elem.trigger('drop_tag', {'tid': t.attr('rel'), 'tag': t.text()});
				t.remove();
			});
			return tag;
		}
	});
})(jQuery);