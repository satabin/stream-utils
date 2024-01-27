// ==UserScript==
// @name         New Deezer Tuna browser script
// @namespace    satabin
// @version      1.0.1
// @description  Get song information from Deezer web players, based on Tuna Script by univrsal
// @author       satabin
// @match        *://www.deezer.com/*
// @grant        unsafeWindow
// @license      GPLv2
// ==/UserScript==

(function() {
    'use strict';
    console.log("Loading tuna browser script");

    // Configuration
    var port = 1608;
    var refresh_rate_ms = 500;
    var cooldown_ms = 10000;

    // Tuna isn't running we sleep, because every failed request will log into the console
    // so we don't want to spam it
    var failure_count = 0;
    var cooldown = 0;
    var last_state = {};

    function post(data) {
        if (data.status) {
            /* if this tab isn't playing and the status hasn't changed we don't send an update
             * otherwise tabs that are paused would constantly send the paused/stopped state
             * which interferes another tab that is playing something
             */
            if (data.status !== "playing" && last_state.status === data.status) {
                return; // Prevent the paused state from being continously sent, since this tab is not playing, should prevent tabs from clashing with eachother
            }
        }
        last_state = data;
        var url = 'http://localhost:' + port + '/';
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Access-Control-Allow-Headers', '*');
        xhr.setRequestHeader('Access-Control-Allow-Origin', '*');

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status !== 200) {
                    failure_count++;
                }
            }
        };

        xhr.send(JSON.stringify({data,hostname:window.location.hostname,date:Date.now()}));
    }

    // Safely query something, and perform operations on it
    function query(target, fun, alt = null) {
        var element = document.querySelector(target);
        if (element !== null) {
            return fun(element);
        }
        return alt;
    }

    function timestamp_to_ms(ts) {
        var splits = ts.split(':');
        if (splits.length == 2) {
            return splits[0] * 60 * 1000 + splits[1] * 1000;
        } else if (splits.length == 3) {
            return splits[0] * 60 * 60 * 1000 + splits[1] * 60 * 1000 + splits[0] * 1000;
        }
        return 0;
    }

    function StartFunction() {
        setInterval(()=>{
            if (failure_count > 3) {
                console.log('Failed to connect multiple times, waiting a few seconds');
                cooldown = cooldown_ms;
                failure_count = 0;
            }

            if (cooldown > 0) {
                cooldown -= refresh_rate_ms;
                return;
            }

            let status = query('.page-player *[data-testid^=play_button]', e => {
                if (e) {
                    if(e.getAttribute('data-testid') === 'play_button_pause') {
                        return "playing";
                    } else {
                        return "stopped";
                    }
                }
                return "unknown";
            });

            let cover = query('.page-player *[data-testid=item_cover] img', e => {
                if (e) {
                    return e.src.replace(/\d+x\d+/, '512x512');
                }
                return null;
            });

            let title = query('.page-player *[data-testid=item_title]', e => {
                if (e) {
                    return e.textContent;
                }
                return null;
            });
            let artists = query('.page-player *[data-testid=item_subtitle]', e => {
                if (e) {
                    return [e.textContent];
                }
                return null;
            });

            let duration = query('.page-player *[data-testid=remaining_time]', e => timestamp_to_ms(e.textContent));
            let progress = query('.page-player *[data-testid=elapsed_time]', e => timestamp_to_ms(e.textContent));
            if (title !== null) {
                post({ cover, title, artists, status, progress, duration });
            }
        }, refresh_rate_ms);

    }

    StartFunction();
})();
