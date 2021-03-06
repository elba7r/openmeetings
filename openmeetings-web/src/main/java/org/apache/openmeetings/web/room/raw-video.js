/* Licensed under the Apache License, Version 2.0 (the "License") http://www.apache.org/licenses/LICENSE-2.0 */
var Video = (function() {
	const self = {};
	let c, v, vc, t, f, size, vol, slider, handle, video, rtcPeer
		, lastVolume = 50;

	function _getName() {
		return c.user.firstName + ' ' + c.user.lastName;
	}
	function _getExtra() {
		return t.height() + 2 + (f.is(':visible') ? f.height() : 0);
	}
	function _resizeDlg(_w, _h) {
		const h = _h + _getExtra();
		_resizeDlgArea(_w, h);
		return h;
	}
	function _vidResize(_w, _h) {
		try {
			swf[0].vidResize(Math.floor(_w), Math.floor(_h));
		} catch (err) {}
	}
	function _resizeDlgArea(_w, _h) {
		v.dialog('option', 'width', _w).dialog('option', 'height', _h);
		const h = _h - _getExtra();
		_resize(_w, h);
		if (Room.getOptions().interview) {
			v.dialog('widget').css(VideoUtil.getPos());
		}
		_vidResize(_w, h);
	}
	function _resizePod() {
		const p = v.parents('.pod,.pod-big')
			, pw = p.width(), ph = p.height();
		_resizeDlgArea(pw, ph);
	}
	function _resize(w, h) {
		vc.width(w).height(h);
		video.width(w).height(h);
	}
	function _handleMicStatus(state) {
		if (!f.is(':visible')) {
			return;
		}
		if (state) {
			f.find('.off').hide();
			f.find('.on').show();
			f.addClass('ui-state-highlight');
			t.addClass('ui-state-highlight');
		} else {
			f.find('.off').show();
			f.find('.on').hide();
			f.removeClass('ui-state-highlight');
			t.removeClass('ui-state-highlight');
		}
	}
	function _handleVolume(val) {
		handle.text(val);
		const ico = vol.find('.ui-icon');
		if (val > 0 && ico.hasClass('ui-icon-volume-off')) {
			ico.toggleClass('ui-icon-volume-off ui-icon-volume-on');
			vol.removeClass('ui-state-error');
			_handleMicStatus(true);
		} else if (val === 0 && ico.hasClass('ui-icon-volume-on')) {
			ico.toggleClass('ui-icon-volume-on ui-icon-volume-off');
			vol.addClass('ui-state-error');
			_handleMicStatus(false);
		}
		/* TODO
		if (typeof(swf[0].setVolume) === 'function') {
			swf[0].setVolume(val);
		}
		*/
	}
	function _mute(mute) {
		if (!slider) {
			return;
		}
		if (mute) {
			const val = slider.slider('option', 'value');
			if (val > 0) {
				lastVolume = val;
			}
			slider.slider('option', 'value', 0);
			_handleVolume(0);
		} else {
			slider.slider('option', 'value', lastVolume);
			_handleVolume(lastVolume);
		}
	}
	function _initContainer(_id, name, opts) {
		let contSel;
		if (opts.interview) {
			const area = $('.pod-area');
			const contId = UUID.v4();
			contSel = '#' + contId;
			area.append($('<div class="pod"></div>').attr('id', contId));
			WbArea.updateAreaClass();
		} else {
			contSel = '.room.box';
		}
		$(contSel).append(OmUtil.tmpl('#user-video', _id).attr('title', name)
				.attr('data-client-uid', c.type + c.cuid).data(self)); //FIXME TODO c.type === 'undefined'
		return contSel;
	}
	function _initDialog(v, opts) {
		if (opts.interview) {
			v.dialog('option', 'draggable', false);
			v.dialog('option', 'resizable', false);
			v.dialogExtend({
				closable: false
				, collapsable: false
				, dblclick: false
			});
			$('.pod-area').sortable('refresh');
		} else {
			v.dialog('option', 'draggable', true);
			v.dialog('option', 'resizable', true);
			v.on('dialogresizestop', function(event, ui) {
				const w = ui.size.width - 2
					, h = ui.size.height - t.height() - 4 - (f.is(':visible') ? f.height() : 0);
				_resize(w, h);
				_vidResize(w, h);
			});
			if (VideoUtil.isSharing(c)) {
				v.on('dialogclose', function() {
					VideoManager.close(c.uid, true);
				});
			}
			v.dialogExtend({
				icons: {
					'collapse': 'ui-icon-minus'
				}
				, closable: VideoUtil.isSharing(c)
				, collapsable: true
				, dblclick: 'collapse'
			});
		}
	}
	function _init(_c, _pos) {
		c = _c;
		size = {width: c.width, height: c.height};
		const _id = VideoUtil.getVid(c.uid)
			, name = _getName()
			, _w = c.width
			, _h = c.height
			, opts = Room.getOptions();
		const contSel = _initContainer(_id, name, opts);
		v = $('#' + _id);
		v.dialog({
			classes: {
				'ui-dialog': 'ui-corner-all video user-video' + (opts.showMicStatus ? ' mic-status' : '')
				, 'ui-dialog-titlebar': 'ui-corner-all' + (opts.showMicStatus ? ' ui-state-highlight' : '')
			}
			, width: _w
			, minWidth: 40
			, minHeight: 50
			, autoOpen: true
			, modal: false
			, appendTo: contSel
		});
		_initDialog(v, opts);
		t = v.parent().find('.ui-dialog-titlebar').attr('title', name);
		f = v.find('.footer');
		if (!VideoUtil.isSharing(c)) {
			v.parent().find('.ui-dialog-titlebar-buttonpane')
				.append($('#video-volume-btn').children().clone())
				.append($('#video-refresh-btn').children().clone());
			const volume = v.parent().find('.dropdown-menu.video.volume');
			slider = v.parent().find('.slider');
			vol = v.parent().find('.ui-dialog-titlebar-volume')
				.on('mouseenter', function(e) {
					e.stopImmediatePropagation();
					volume.toggle();
				})
				.click(function(e) {
					e.stopImmediatePropagation();
					const muted = $(this).find('.ui-icon').hasClass('ui-icon-volume-off');
					roomAction('mute', JSON.stringify({uid: c.cuid, mute: !muted}));
					_mute(!muted);
					volume.hide();
					return false;
				}).dblclick(function(e) {
					e.stopImmediatePropagation();
					return false;
				});
			v.parent().find('.ui-dialog-titlebar-refresh')
				.click(function(e) {
					e.stopImmediatePropagation();
					_refresh();
					return false;
				}).dblclick(function(e) {
					e.stopImmediatePropagation();
					return false;
				});
			volume.on('mouseleave', function() {
				$(this).hide();
			});
			handle = v.parent().find('.slider .handle');
			slider.slider({
				orientation: 'vertical'
				, range: 'min'
				, min: 0
				, max: 100
				, value: lastVolume
				, create: function() {
					handle.text($(this).slider('value'));
				}
				, slide: function(event, ui) {
					_handleVolume(ui.value);
				}
			});
			const hasAudio = VideoUtil.hasAudio(c);
			_handleMicStatus(hasAudio);
			if (!hasAudio) {
				vol.hide();
			}
		}
		v.on("remove", function () {
			OmUtil.log('Disposing participant ' + c.uid);
			if (!!rtcPeer) {
				rtcPeer.dispose();
				rtcPeer = null;
			}
		});
		vc = v.find('.video');
		vc.width(_w).height(_h);
		//broadcast
		const o = Room.getOptions();
		if (c.self) {
			o.cam = c.cam;
			o.mic = c.mic;
			o.mode = 'broadcast';
		} else {
			o.mode = 'play';
		}
		o.av = c.activities.join();
		o.rights = o.rights.join();
		o.width = c.width;
		o.height = c.height;
		o.sid = c.sid;
		o.uid = c.uid;
		o.cuid = c.cuid;
		o.userId = c.user.id;
		o.broadcastId = c.broadcastId;
		o.type = c.type;
		delete o.keycode;

		const hasVideo = VideoUtil.hasVideo(c)
			, imgUrl = 'profile/' + o.userId + '?anti=' + new Date().getTime();  //TODO add normal URL ????
		video = $(hasVideo ? '<video>' : '<audio>').attr('id', 'vid' + _id)
			.width(o.width).height(o.height)
			.prop('autoplay', true).prop('controls', false);
		if (hasVideo) {
			video.attr('poster', imgUrl);
		} else {
			vc.addClass('audio-only').css('background-image', 'url(' + imgUrl + ')');
		}

		vc.append(video);
		/* TODO
		swf = initSwf(vc, 'main.swf', _id + '-swf', o);
		swf.attr('width', _w).attr('height', _h);
		*/
		v.dialog('widget').css(_pos);
		return v;
	}
	function _update(_c) {
		const opts = Room.getOptions();
		c.screenActivities = _c.screenActivities;
		c.activities = _c.activities;
		c.user.firstName = _c.user.firstName;
		c.user.lastName = _c.user.lastName;
		const hasAudio = VideoUtil.hasAudio(c);
		_handleMicStatus(hasAudio);
		if (hasAudio) {
			vol.show();
		} else {
			vol.hide();
			v.parent().find('.dropdown-menu.video.volume').hide();
		}
		if (opts.interview && c.pod !== _c.pod) {
			c.pod = _c.pod;
			v.dialog('option', 'appendTo', '.pod.pod-' + c.pod);
		}
		const name = _getName();
		v.dialog('option', 'title', name).parent().find('.ui-dialog-titlebar').attr('title', name);
		/* TODO
		if (typeof(swf[0].update) === 'function') {
			c.self ? swf[0].update() : swf[0].update(c);
		}
		*/
	}
	function _refresh(_opts) {
		/*
		if (typeof(swf[0].refresh) === 'function') {
			const opts = _opts || {};
			if (!Room.getOptions().interview && !isNaN(opts.width)) {
				_resizeDlg(opts.width, opts.height);
			}
			try {
				swf[0].refresh(opts);
			} catch (e) {
				//swf might throw
			}
		}
		*/
	}
	function _setRights(_r) {
		/*
		if (typeof(swf[0].setRights) === 'function') {
			swf[0].setRights(_r);
		}
		*/
	}
	function _cleanup() {
		/*
		if (typeof(swf[0].cleanup) === 'function') {
			swf[0].cleanup();
		}
		*/
	}

	self.update = _update;
	self.refresh = _refresh;
	self.mute = _mute;
	self.isMuted = function() { return 0 === slider.slider('option', 'value'); };
	self.init = _init;
	self.client = function() { return c; };
	self.setRights = _setRights;
	self.cleanup = _cleanup;
	self.video = function() { return video[0]; };
	self.setPeer = function(p) { rtcPeer = p; };
	self.getPeer = function() { return rtcPeer; };
	self.onIceCandidate = function(candidate, wp) {
		OmUtil.log("Local candidate" + JSON.stringify(candidate));
		VideoManager.sendMessage({
			id: 'onIceCandidate'
			, candidate: candidate
			, uid: c.uid
		});
	};
	self.resizePod = _resizePod;
	return self;
});
