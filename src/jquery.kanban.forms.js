/**
 * Kanban English Translation
 * jtm@hi.is Univercity of Iceland
 * Licensed under the MIT:
 * http://www.opensource.org/licenses/mit-license.php
**/
;(function($){
	$.extend(Kanban.prototype, {
		/**
		 * Create and show overlay.
		 */
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
		}
		/**
		 *  Create hidden input for overlay forms
		 */
		,overlay_input : function(elem, text, on_enter, type) {
			var kanban = this;
			var id = elem.attr('id');
			elem.addClass(kanban.p('clickable')).click(function() {
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
			if(text) {
				input.val(text);
				if(text.length > 250) {
					input.addClass(this.p('long'));
				}
			}
			var wrap = $('<div>').addClass(this.p('overlay_input_wrap'));
			wrap.append(elem);
			form.append(input);
//			form.append($('<span class="kb_icon kb_overlay_save" rel="kb_column_2">+</span>'));
			form.hide();
			wrap.append(form);
			return wrap;
		}
		/**
		 * Edit task
		 */
		,edit_form : function(task) {
			var kanban = this;
			var mdiv = $('<div>', {'class' : kanban.p('task_main')});
			// Header
			var header = $('<div>', {'class' : kanban.p('overlay_header')});
			var title = $('<h3>', {'id': kanban.p('set_title'), rel: task.id}).text(task.title);
			if(this.can_edit(task)) {
				header.append(kanban.overlay_input(
						title, 
						task.title, 
						function(from) {
							var val = $(from).val();
							var send = {
								'request': 	'set_title'
								,'id': 		task.id
								,'value': 	val
							};
							kanban.request(send, function() {
								kanban.$elem.trigger('reload_task', {id: task.id});
								$(kanban.p('#set_title')).text(val);
							});
						}
					)
				);
			} else {
				header.append(title);
			}
			
			mdiv.append(header);
			// Priority
			var ps = $('<div>', {'class': kanban.p('prioritys_current')});
			var inner = $('<div>', {'class': kanban.p('priority')});
			var show = kanban.fill_priority(task.priority, 'show');
			show.attr('id', kanban.p('current_priority'));
			inner.append(show);
			ps.append(inner);
			mdiv.append(ps);
			
			// Main content
			var div = $('<div>').addClass(kanban.p('main'));
			div.append($('<div>').addClass(kanban.p('separator')).text(kanban.b('Description')));
			div.append($('<hr>'));
			if(this.can_edit(task)) {
				var desc = task.body ? task.body : kanban.b('Add description');
				var delem = task.body
					? $('<a>', {'id': kanban.p('add_description'), rel: task.id}).text(desc)
					: $('<textarea>', {'id': kanban.p('add_description'), rel: task.id, 'class': kanban.p('empty_input clickable')}).val(desc);
				div.append(kanban.overlay_input(
						delem 
						,desc
						,function(from) {					
							var send = {
								'request': 	'add_description'
								,'id': 		task.id
								,'value': 	$(from).val()
							};
							kanban.request(send, null);
						}
					    ,'<textarea>'
					)
				);
			} else {
				var desc = task.body ? task.body : kanban.b('No description');
				div.append($('<a>', {'id': kanban.p('add_description')}).text(desc));
			}
			
			div.append($('<div>').addClass(kanban.p('separator')).text(kanban.b('Comments')));
			div.append($('<hr>'));
			var cdiv = $('<ul>').addClass(kanban.p('comments'));
			$.each(task.comments, function(i, comment) {
				cdiv.append(kanban.fill_comment(comment));
			});
			div.append(kanban.overlay_input(
				$('<textarea>', {'id': kanban.p('add_comment'), rel: task.id, 'class': kanban.p('empty_input clickable')}).val(kanban.b('Add comment')), '', 
					function(from) {	
						var from = $(from);
						var send = {
							'request': 	'add_comment'
							,'id': 		task.id
							,'uid':		kanban.current_user.uid
							,'value': 	from.val()
						};
						kanban.request(send, function(data) {
							cdiv.prepend(kanban.fill_comment({'body': from.val()}));
							from.val('');
						});
					}, 
				    '<textarea>'
				)
			);
			div.append(cdiv);
			mdiv.append(div);
			// Sidebar
			var sidebar = $('<div>', {'class' : kanban.p('sidebar')});
			// Members
			sidebar.append($('<div>').addClass(kanban.p('separator')).text(kanban.b('Members')));
			sidebar.append($('<hr>'));
			var users = $('<div>', {'class' : kanban.p('users')});
			var ul = $('<ul>', {'class' : kanban.p('userlist')});
			$.each(task.users, function(i, user) {
				var u = kanban.fill_user(user, null, false, function() {
					kanban.$elem.trigger('drop_user', {uid: user.id, tid: task.id});
				});
				if(user.uid == task.owner) u.addClass(kanban.p('owner'));
				ul.append(u);
			});
			users.append(ul);
			sidebar.append(users);
			if(this.can_edit(task)) {
				// Actions
				sidebar.append($('<div>').addClass(kanban.p('separator')).text(kanban.b('Actions')));
				sidebar.append($('<hr>'));
				sidebar.append(kanban.fill_action({'key': 'set_priority', 'icon': '◱', 'action': function() {
					$(kanban.p('.prioritys')).toggle();
				}, 'text': kanban.b('Set priority')}));
				var ps = $('<div>', {'class': kanban.p('prioritys')});
				$.each(kanban.config.prioritys, function(i, v) {
					if(v.color) {
						var inner = $('<div>', {'class': kanban.p('priority'), 'rel': v.color});
						inner.append($('<div>', {'class': 'show'}).css("background-color", v.color));
						inner.click(function() {
							var color = $(this).attr("rel");
							$(kanban.p('#current_priority')).css("background-color", color);
							kanban.$elem.trigger('set_priority', {tid: task.id, priority: i});
						});
						ps.append(inner);
					}
				});
				sidebar.append(ps.hide());
				sidebar.append(kanban.fill_action({'key': 'resolve', 'icon': '◧', 'text': kanban.b('Resolve'), 'action': function() {
					if(confirm(kanban.b('Resolve task ?'))) {
						kanban.$elem.trigger('resolve', {tid: task.id});
						$('#' + kanban.p("overlay")).overlay().close();
					}
				}}));
			}
			mdiv.append(sidebar);
			return mdiv;
		}
		/** 
		 * Filters
		 * */
		,filter_form : function() {
			var kanban = this;
			var mdiv = $('<div>', {'class' : kanban.p('user_main')});
			var header = $('<div>', {'class' : kanban.p('overlay_header')});
			header.append($('<h3>', {'class': kanban.p('overlay_title')}).text(kanban.b('Filter')));
			mdiv.append(header);
			var form = $('<form>', {'id' : kanban.p('user_form'), 'method' : 'post'});
			// FORM HERE
			mdiv.append(form);
			return mdiv;
		}
		/** 
		 * New user
		 * */
		,user_form : function() {
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
		}
		/**
		 * FIXME
		 */
		,edit_user_form : function(user) {
			
		}
	});
})(jQuery);