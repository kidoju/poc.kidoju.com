/**
 * Copyright (c) 2013-2015 Memba Sarl. All rights reserved.
 * Sources at https://github.com/Memba
 */

/* jshint browser: true, jquery: true */
/* globals define: false */

(function (f, define) {
    'use strict';
    define([
        './vendor/kendo/kendo.binder',
        './vendor/kendo/kendo.dropdownlist',
        './vendor/kendo/kendo.tabstrip',
        './vendor/kendo/kendo.listview',
        './vendor/kendo/kendo.pager',
        './window.assert',
        './window.log'
    ], f);
})(function () {

    'use strict';

    /* This function has too many statements. */
    /* jshint -W071 */

    (function ($, undefined) {

        var kendo = window.kendo;
        var Widget = kendo.ui.Widget;
        var DataSource = kendo.data.DataSource;
        var ObservableObject = kendo.data.ObservableObject;
        var DropDownList = kendo.ui.DropDownList;
        var ListView = kendo.ui.ListView;
        var Pager = kendo.ui.Pager;
        var TabStrip = kendo.ui.TabStrip;
        var assert = window.assert;
        var logger = new window.Log('kidoju.widgets.assetmanager');
        var NUMBER = 'number';
        var STRING = 'string';
        var ARRAY = 'array';
        var CHANGE = 'change';
        var CLICK = 'click';
        var DELETE = 'delete';
        var ERROR = 'error';
        var UPLOAD = 'upload';
        // var MODULE = 'kidoju.widgets.assetmanager';
        var NS = '.kendoAssetManager';
        var WIDGET_CLASS = 'k-widget kj-assetmanager';
        var DEFAULT_FILTER = {};
        var TOOLBAR_TMPL = '<div class="k-widget k-filebrowser-toolbar k-header k-floatwrap">' +
                '<div class="k-toolbar-wrap">' +
                    '<div class="k-widget k-upload"><div class="k-button k-button-icontext k-upload-button"><span class="k-icon k-add"></span>#=messages.toolbar.upload#<input type="file" name="file" /></div></div>' +
                    '<button type="button" class="k-button k-button-icon k-state-disabled"><span class="k-icon k-delete" /></button>&nbsp;' +
                    '<label style="display:none">#=messages.toolbar.filter#<select /></label>' +
                '</div>' +
                '<div class="k-tiles-arrange">' +
                    '<div class="k-widget k-search-wrap k-textbox"><input placeholder="#=messages.toolbar.search#" class="k-input"><a href="\\#" class="k-icon k-i-close k-search"></a></div>' +
                '</div>' +
            '</div>';
        var ITEM_TMPL = '<li class="k-tile" ' + kendo.attr('uid') + '="#=uid#" ' + kendo.attr('type') + '="#=type$()#">' +
                '#if (/^image\\//.test(type$())){#' +
                    '<div class="k-thumb"><img alt="#=name$()#" src="#=url#" class="k-image"></span></div>' +
                '#}else{#' +
                    '<div class="k-thumb"><span class="k-icon k-file"></span></div>' +
                '#}#' +
                '<strong>#=name$()#</strong>' +
                '<span class="k-filesize">#=size$()#</span>' +
            '</li>';
        var SCHEMA = {
                data: 'data',
                model: {
                    id: 'url',
                    fields: {
                        size: { type: NUMBER, editable: false },
                        url:  { type: STRING, editable: false, nullable: true }
                    },
                    name$: function () { return nameFormatter(this.get('url')); },
                    size$: function () { return sizeFormatter(this.get('size')); },
                    type$: function () { return typeFormatter(this.get('url')); }
                },
                total: 'total',
                type: 'json'
            };

        /*********************************************************************************
         * Helpers
         *********************************************************************************/

        /**
         * Extracts file name from url
         * @param url
         * @returns {*}
         */
        function nameFormatter(url) {
            assert.type(STRING, url, kendo.format(assert.messages.type.default, 'url', STRING));
            return url.split('\\').pop().split('/').pop();
        }

        /**
         * Returns a file size formatted with bytes, KB, MB, GB
         * @param size
         * @returns {*}
         */
        function sizeFormatter(size) {
            assert.type(NUMBER, size, kendo.format(assert.messages.type.default, 'size', NUMBER));
            if (!size) { return ''; }
            var suffix = ' bytes';
            if (size >= 1073741824) {
                suffix = ' GB';
                size /= 1073741824;
            } else if (size >= 1048576) {
                suffix = ' MB';
                size /= 1048576;
            } else if (size >= 1024) {
                suffix = ' KB';
                size /= 1024;
            }
            return Math.round(size * 100) / 100 + suffix;
        }

        /* This function's cyclomatic complexity is too high. */
        /* jshint -W074 */

        /**
         * Convert file extension to mime type
         * @see http://hul.harvard.edu/ois/systems/wax/wax-public-help/mimetypes.htm
         * @param url
         * @returns {*}
         */
        function typeFormatter(url) {
            assert.type(STRING, url, kendo.format(assert.messages.type.default, 'url', STRING));
            var ext = url.split('.').pop();
            switch (ext) {
                case 'gif':
                    return 'image/gif';
                case 'jpg':
                case 'jpeg':
                    // case 'jpeg':
                    return 'image/jpeg';
                case 'mp3':
                    // @see http://tools.ietf.org/html/rfc3003
                    // @see https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats#MP3
                    return 'audio/mpeg';
                case 'mp4':
                    // @see http://www.rfc-editor.org/rfc/rfc4337.txt
                    return 'video/mp4';
                case 'ogg':
                    return 'audio/ogg';
                case 'ogv':
                    return 'video/ogg';
                case 'png':
                    return 'image/png';
                case 'svg':
                    return 'image/svg+xml';
                case 'wav':
                    return 'audio/wav';
                case 'webm':
                    return 'video/webm';
                default:
                    return 'application/octet-stream';
            }
        }

        /* jshint +W074 */

        /*********************************************************************************
         * Widget
         *********************************************************************************/

        /**
         * @class AssetManager Widget (kendoAssetManager)
         */
        var AssetManager = Widget.extend({

            /**
             * Initializes the widget
             * @param element
             * @param options
             */
            init: function (element, options) {
                var that = this;
                options = options || {};
                Widget.fn.init.call(that, element, options);
                logger.debug('widget initialized');
                that._dataSource();
                that._layout();
            },

            /**
             * Widget options
             * @property options
             */
            options: {
                name: 'AssetManager',
                toolbarTemplate: TOOLBAR_TMPL,
                itemTemplate: ITEM_TMPL,
                schema: SCHEMA,
                transport: {},
                collections: [],
                filter: DEFAULT_FILTER,
                messages: {
                    toolbar: {
                        upload: 'Upload',
                        delete: 'Delete',
                        filter: 'Collection: ',
                        search: 'Search'
                    },
                    tabs: {
                        default: 'Project'
                    }
                }
            },

            /**
             * Widget events
             * @property events
             */
            events: [
                CHANGE,
                DELETE,
                ERROR,
                UPLOAD
            ],


            /**
             * Predefined filtes
             */
            filters: {
                default: DEFAULT_FILTER,
                images: {
                    logic: 'or',
                    filters: [
                        { field: 'url', operator: 'endswith', value: '.gif' },
                        { field: 'url', operator: 'endswith', value: '.jpg' },
                        // { field: 'url', operator: 'endswith', value: '.jpeg' },
                        { field: 'url', operator: 'endswith', value: '.png' },
                        { field: 'url', operator: 'endswith', value: '.svg' }
                    ]
                },
                audio: { field: 'url', operator: 'endswith', value: '.mp3' },
                video: { field: 'url', operator: 'endswith', value: '.mp4' }
            },

            /**
             * Gets the url of the selected item
             * @returns {*}
             */
            value: function () {
                var that = this;
                var selected = that._selectedItem();
                if (selected instanceof ObservableObject) {
                    return selected.url;
                }
            },

            /**
             * Builds the widget layout
             * @private
             */
            _layout: function () {
                var that = this;
                that.wrapper = that.element;
                that.element.addClass(WIDGET_CLASS);
                that._tabStrip();
                that._tabContent();
            },

            /**
             * Add a tabStrip with as many tabs as collections
             * @private
             */
            _tabStrip: function () {
                assert.type(ARRAY, this.options.collections, kendo.format(assert.messages.type.default, 'this.options.collections', ARRAY));
                var collections = this.options.collections;
                var div = $('<div></div>');
                var ul = $('<ul></ul>').appendTo(div);

                // Add default tab
                ul.append('<li class="k-state-active">' + this.options.messages.tabs.default + '</li>');
                div.append('<div></div>');

                // Add a tab per collection
                for (var i = 0; i < collections.length; i++) {
                    ul.append('<li>' + collections[i].name + '</li>');
                    div.append('<div></div>');
                }
                div.appendTo(this.element);

                // Set the tabStrip item of the component
                this.tabStrip = div.kendoTabStrip({
                    tabPosition: 'left',
                    animation: { open: { effects: 'fadeIn' } },
                    select: $.proxy(this._onTabSelect, this)
                }).data('kendoTabStrip');

                assert.instanceof(TabStrip, this.tabStrip, kendo.format(assert.messages.instanceof.default, 'this.tabStrip', 'kendo.ui.TabStrip'));
            },

            /**
             * Add default content tab
             * Note: content shall be moved/shared accross tabs; Only the dataSource and toolbar are updated when changing tabs
             * @private
             */
            _tabContent: function () {
                assert.instanceof(TabStrip, this.tabStrip, kendo.format(assert.messages.instanceof.default, 'this.tabStrip', 'kendo.ui.TabStrip'));

                // Add the file browser wrapping div
                this.fileBrowser = $('<div class="k-filebrowser"></div>')
                    .appendTo(this.tabStrip.contentHolder(0));

                // Add the toolbar
                this._toolbar();

                // Add the list view
                this._listView();
            },

            /**
             * Add the toolbar to the fileBrowser
             * Note: all collections are read-only so upload/delete is hidden except on the default tab
             * @private
             */
            _toolbar: function () {
                var that = this;
                var template = kendo.template(that.options.toolbarTemplate);
                var messages = that.options.messages;

                // Add template
                that.toolbar = $(template({
                    messages: messages
                })).appendTo(that.fileBrowser);
                assert.instanceof($, that.toolbar, kendo.format(assert.messages.instanceof.default, 'this.toolbar', 'window.jQuery'));

                // Collection drop down list
                that.dropDownList = that.toolbar.find('div.k-toolbar-wrap select')
                    .kendoDropDownList({
                        dataSource: [],
                        change: $.proxy(that._onDropDownListChange, that)
                    })
                    .data('kendoDropDownList');
                assert.instanceof(DropDownList, that.dropDownList, kendo.format(assert.messages.instanceof.default, 'this.dropDownList', 'kendo.ui.DropDownList'));

                // Search
                that.searchInput = that.toolbar
                    .find('input.k-input');
                assert.instanceof($, that.searchInput, kendo.format(assert.messages.instanceof.default, 'this.searchInput', 'window.jQuery'));

                // Events
                that.toolbar
                    .on(CHANGE + NS, '.k-upload input[type=file]', $.proxy(that._onFileInputChange, that))
                    .on(CLICK + NS, 'button:not(.k-state-disabled):has(.k-delete)', $.proxy(that._onDeleteButtonClick, that))
                    .on(CHANGE + NS, 'input.k-input', $.proxy(that._onSearchInputChange, that))
                    .on(CLICK + NS, 'a.k-i-close', $.proxy(that._onSearchClearClick, that));

                // TODO that._attachDropzoneEvents();
            },

            /**
             * Event handler triggered when clicking the upload button and selecting a file (which changes teh file input)
             * @param e
             * @private
             */
            _onFileInputChange: function (e) {
                var that = this;
                assert.instanceof($.Event, e, kendo.format(assert.messages.instanceof.default, 'e', 'window.jQuery.Event'));
                assert.instanceof(window.HTMLInputElement, e.target, kendo.format(assert.messages.instanceof.default, 'e.target', 'window.HTMLInputElement'));
                var files = e.target.files;
                if (files instanceof window.FileList && files.length) {
                    that.trigger(UPLOAD, { files: files });
                    that.toolbar.find('.k-upload input[type=file]').val('');
                }
            },

            /**
             * Event handler triggered when clicking the delete button
             * @private
             */
            _onDeleteButtonClick: function () {
                var that = this;
                that.trigger(DELETE, { value: that.value() });
            },

            /**
             * Event handler triggered when selecting another collection in the toolbar drop down list
             * @private
             */
            _onDropDownListChange: function (e) {
                assert.isPlainObject(e, kendo.format(assert.messages.isPlainObject.default, 'e'));
                assert.instanceof(DropDownList, e.sender, kendo.format(assert.messages.instanceof.default, 'e.sender', 'kendo.ui.DropDownList'));
                assert.instanceof(TabStrip, this.tabStrip, kendo.format(assert.messages.instanceof.default, 'this.tabStrip', 'kendo.ui.TabStrip'));
                this._resetTransport(this.tabStrip.select().index() - 1, e.sender.selectedIndex /*, false*/);
            },

            /**
             * Event handler trigger when changing search input
             * @param e
             * @private
             */
            _onSearchInputChange: function (e) {
                assert.instanceof($.Event, e, kendo.format(assert.messages.instanceof.default, 'e', 'window.jQuery.Event'));
                assert.instanceof(window.HTMLInputElement, e.target, kendo.format(assert.messages.instanceof.default, 'e.target', 'window.HTMLInputElement'));
                var filter = this.options.filter;
                var value =  $(e.target).val();
                var search = { field: 'url', operator: 'contains', value: value };
                if ($.type(value) === STRING && value.length) {
                    if ($.isArray(filter)) {
                        // We assume all array items are valid filters
                        filter = filter.slice().push(search);
                    } else if ($.isPlainObject(filter) && $.type(filter.field) === STRING && $.type(filter.operator) === STRING && filter.value) {
                        filter = [filter, search];
                    } else if ($.isPlainObject(filter) && filter.logic === 'and' && $.isArray(filter.filters)) {
                        filter = $.extend(true, {}, filter).filters.push(search);
                    } else if ($.isPlainObject(filter) && filter.logic === 'or' && $.isArray(filter.filters)) {
                        filter = { logic: 'and', filters: [filter, search] };
                    } else {
                        filter = search;
                    }
                }
                // Note: no need to sort the default alphabetical order
                this.dataSource.query({ filter: filter, page: 1, pageSize: this.dataSource.pageSize() });
            },

            /**
             * Event handler triggered whhen clicking the clear icon in the search input
             * @private
             */
            _onSearchClearClick: function () {
                var searchInput = this.searchInput;
                assert.instanceof($, searchInput, kendo.format(assert.messages.instanceof.default, 'this.searchInput', 'window.jQuery'));
                if (searchInput.val() !== '') {
                    searchInput.val('').trigger(CHANGE + NS);
                }
            },

            /**
             * Add the list view to the file browser
             * Note: selecting a file in the list view updates the widget value() and triggers the change event
             * @private
             */
            _listView: function () {
                assert.instanceof($, this.fileBrowser, kendo.format(assert.messages.instanceof.default, 'this.fileBrowser', 'jQuery'));
                assert.instanceof(DataSource, this.dataSource, kendo.format(assert.messages.instanceof.default, 'this.dataSource', 'kendo.data.DataSource'));
                this.listView = $('<ul class="k-reset k-floats k-tiles"/>')
                    .appendTo(this.fileBrowser)
                    .kendoListView({
                        // autoBind: false,
                        change: $.proxy(this._onListViewChange, this),
                        dataBinding: $.proxy(this._onListViewDataBinding, this),
                        dataSource: this.dataSource,
                        selectable: true,
                        template: kendo.template(this.options.itemTemplate)
                    })
                    .data('kendoListView');
                this.pager = $('<div class="k-pager-wrap"></div>')
                    .appendTo(this.fileBrowser)
                    .kendoPager({
                        dataSource: this.dataSource
                    })
                    .data('kendoPager');
                assert.instanceof(ListView, this.listView, kendo.format(assert.messages.instanceof.default, 'this.listView', 'kendo.ui.ListView'));
                assert.instanceof(Pager, this.pager, kendo.format(assert.messages.instanceof.default, 'this.pager', 'kendo.ui.Pager'));
            },

            /**
             * Event handler triggered when the asset selection changes in the list view
             * @private
             */
            _onListViewChange: function () {
                assert.instanceof(TabStrip, this.tabStrip, kendo.format(assert.messages.instanceof.default, 'this.tabStrip', 'kendo.ui.TabStrip'));
                assert.instanceof($, this.toolbar, kendo.format(assert.messages.instanceof.default, 'this.toolbar', 'jQuery'));
                if (this._selectedItem() instanceof ObservableObject) {
                    if (this.tabStrip.select().index() === 0) {
                        this.toolbar.find('.k-delete').parent().removeClass('k-state-disabled').show();
                    }
                    this.trigger(CHANGE, { value: this.value() });
                }
            },

            /**
             * Event handler triggered when data binding a new collection
             * @private
             */
            _onListViewDataBinding: function () {
                assert.instanceof($, this.toolbar, kendo.format(assert.messages.instanceof.default, 'this.toolbar', 'jQuery'));
                this.toolbar.find('.k-delete').parent().addClass('k-state-disabled').hide();
            },

            /**
             * Returns the selected item (a data source item) from the list view
             * @returns {*}
             * @private
             */
            _selectedItem: function () {
                assert.instanceof(ListView, this.listView, kendo.format(assert.messages.instanceof.default, 'this.listView', 'kendo.ui.ListView'));
                assert.instanceof(DataSource, this.dataSource, kendo.format(assert.messages.instanceof.default, 'this.dataSource', 'kendo.data.DataSource'));

                var listView = this.listView;
                var selected = listView.select();

                if (selected instanceof $ && selected.length) {
                    return this.dataSource.getByUid(selected.attr(kendo.attr('uid')));
                }
            },

            /**
             * Event handler triggered when selecting a tab
             * @private
             */
            _onTabSelect: function (e) {
                assert.isPlainObject(e, kendo.format(assert.messages.isPlainObject.default, 'e'));
                assert.instanceof(window.HTMLLIElement, e.item, kendo.format(assert.messages.instanceof.default, 'e.item', 'HTMLLIElement'));
                assert.instanceof(TabStrip, this.tabStrip, kendo.format(assert.messages.instanceof.default, 'this.tabStrip', 'kendo.ui.TabStrip'));
                assert.instanceof($, this.fileBrowser, kendo.format(assert.messages.instanceof.default, 'this.fileBrowser', 'jQuery'));
                assert.instanceof(DataSource, this.dataSource, kendo.format(assert.messages.instanceof.default, 'this.dataSource', 'kendo.data.DataSource'));

                var oldIndex = this.tabStrip.select().index();
                var tabIndex = $(e.item).index();

                // Ensure all content holders have the same height
                this.tabStrip.contentHolder(tabIndex).height(this.tabStrip.contentHolder(oldIndex).height());

                // Move file browser to the selected tab
                this.fileBrowser.appendTo(this.tabStrip.contentHolder(tabIndex));

                // Show/hide upload and delete buttons which are only available on the default Tab
                this.fileBrowser.find('div.k-toolbar-wrap>.k-upload').toggle(tabIndex === 0);
                this.fileBrowser.find('div.k-toolbar-wrap>.k-button').toggle(tabIndex === 0);
                this.fileBrowser.find('div.k-toolbar-wrap>label').toggle(tabIndex !== 0);

                // Change data source transport
                this._resetTransport(tabIndex - 1, 0, true);

                // refresh pager
                this.pager.refresh();
            },

            /**
             * Change data source transport based on selected collection
             * @param colIndex
             * @param subIndex
             * @param all to also reset the toolbar drop down list data source
             * @private
             */
            _resetTransport: function (colIndex, subIndex, all) {

                function getTransport(options) {
                    var transport;
                    if (options) {
                        options.read = typeof options.read === STRING ? { url: options.read } : options.read;
                        transport = $.isFunction(options.read) ? options : new kendo.data.RemoteTransport(options);
                    } else {
                        transport = new kendo.data.LocalTransport({ data: [] });
                    }
                    return transport;
                }

                assert.type(NUMBER, colIndex, kendo.format(assert.messages.type.default, 'colIndex', NUMBER));
                assert.type(NUMBER, subIndex, kendo.format(assert.messages.type.default, 'subIndex', NUMBER));
                assert.type(ARRAY, this.options.collections, kendo.format(assert.messages.type.default, 'this.options.collections', ARRAY));
                assert.instanceof($, this.fileBrowser, kendo.format(assert.messages.instanceof.default, 'this.fileBrowser', 'jQuery'));
                assert.instanceof(DataSource, this.dataSource, kendo.format(assert.messages.instanceof.default, 'this.dataSource', 'kendo.data.DataSource'));
                assert.instanceof(DropDownList, this.dropDownList, kendo.format(assert.messages.instanceof.default, 'this.dropDownList', 'kendo.ui.DropDownList'));

                // Clear search
                this.searchInput.val('');
                this.dataSource.filter(this.options.filter);

                if (colIndex >= 0 && colIndex < this.options.collections.length) {
                    var collection = this.options.collections[colIndex];
                    if ($.isPlainObject(collection.transport)) {
                        this.dataSource.transport = getTransport(collection.transport);
                        this.dropDownList.setDataSource([]);
                        this.dropDownList.wrapper.parent().hide();
                    } else if ($.isArray(collection.collections) && collection.collections.length &&
                        $.isPlainObject(collection.collections[subIndex].transport)) {
                        this.dataSource.transport = getTransport(collection.collections[subIndex].transport);
                        if (all) {
                            this.dropDownList.setDataSource(collection.collections.map(function (item) {
                                return item.name;
                            }));
                            this.dropDownList.select(subIndex);
                            this.dropDownList.wrapper.parent().show();
                        }
                    }
                } else {
                    this.dataSource.transport = getTransport(this.options.transport);
                    this.dropDownList.setDataSource([]);
                    this.dropDownList.wrapper.parent().hide();
                }

                return this.dataSource.read();
            },

            /**
             * Sets/updates the data source
             * @private
             */
            _dataSource: function (transport) {

                if (this.dataSource instanceof DataSource && this._errorHandler) {
                    this.dataSource.unbind(ERROR, this._errorHandler);
                } else {
                    this._errorHandler = $.proxy(this._dataError, this);
                }

                this.dataSource = DataSource
                    .create({
                        filter: this.options.filter,
                        schema: this.options.schema,
                        // keep default sort order
                        transport: $.isPlainObject(transport) ? transport : this.options.transport,
                        pageSize: 12
                    })
                    .bind(ERROR, this._errorHandler);

                this.dataSource.filter(this.options.filter);

            },

            /**
             * Data error handler
             * @param e
             * @private
             */
            _dataError: function (e) {
                // TODO ----------------------------------------------------------------------------------------------------------------------------------

                /*
                var that = this,
                    status;

                if (!that.trigger(ERROR, e)) {
                    status = e.xhr.status;

                    if (e.status == 'error') {
                        if (status == '404') {
                            that._showMessage(that.options.messages.directoryNotFound);
                        } else if (status != '0') {
                            that._showMessage('Error! The requested URL returned ' + status + ' - ' + e.xhr.statusText);
                        }
                    } else if (status == 'timeout') {
                        that._showMessage('Error! Server timeout.');
                    }
                }
                */
            },

            /**
             * Clears the widget
             * @method _clear
             * @private
             */
            _clear: function () {
                var that = this;
                // unbind kendo
                // kendo.unbind($(that.element));
                // unbind all other events
                $(that.element).find('*').off();
                $(that.element).off();
                // remove descendants
                $(that.element).empty();
                // remove element classes
                $(that.element).removeClass(WIDGET_CLASS);
            },

            /**
             * Destroys the widget including all DOM modifications
             * @method destroy
             */
            destroy: function () {
                var that = this;
                Widget.fn.destroy.call(that);
                that._clear();
                // if ($.isFunction(that._refreshHandler)) {
                //    that.options.tools.unbind(CHANGE, that._refreshHandler);
                // }
                kendo.destroy(that.element);
            }

        });

        kendo.ui.plugin(AssetManager);

    }(window.jQuery));

    /* jshint +W071 */

    return window.kendo;

}, typeof define === 'function' && define.amd ? define : function (_, f) { 'use strict'; f(); });
