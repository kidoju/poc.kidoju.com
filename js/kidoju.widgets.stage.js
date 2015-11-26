/**
 * Copyright (c) 2013-2015 Memba Sarl. All rights reserved.
 * Sources at https://github.com/Memba
 */

/* jshint browser: true, jquery: true */
/* globals define: false */

(function (f, define) {
    'use strict';
    define([
        './window.assert',
        './window.logger',
        './vendor/kendo/kendo.binder',
        './kidoju.data',
        './kidoju.tools'
    ], f);
})(function () {

    'use strict';

    /* This function has too many statements. */
    /* jshint -W071 */

    (function ($, undefined) {

        var kendo = window.kendo;
        var ui = kendo.ui;
        var Widget = ui.Widget;
        var data = kendo.data;
        var binders = data.binders;
        var Binder = data.Binder;
        var ObservableObject = data.ObservableObject;
        var ObservableArray = data.ObservableArray;
        var kidoju = window.kidoju;
        var Tool = kidoju.Tool;
        var PageComponent = kidoju.data.PageComponent;
        var PageComponentCollectionDataSource = kidoju.data.PageComponentCollectionDataSource;
        var assert = window.assert;
        var logger = new window.Logger('kidoju.widgets.stage');
        var STRING = 'string';
        var NUMBER = 'number';
        var NULL = null;
        var UNDEFINED = 'undefined';
        var NS = '.kendoStage';
        var MOUSEDOWN = 'mousedown';
        var MOUSEMOVE = 'mousemove';
        var MOUSEUP = 'mouseup'; // TODO: mouseout
        var TOUCHSTART = 'touchstart';
        var TOUCHMOVE = 'touchmove';
        var TOUCHEND = 'touchend';
        var CHANGE = 'change';
        var DATABINDING = 'dataBinding';
        var DATABOUND = 'dataBound';
        var PROPERTYBINDING = 'propertyBinding';
        var PROPERTYBOUND = 'propertyBound';
        var SELECT = 'select';
        var ENABLE = 'enable';
        var MOVE = 'move';
        var RESIZE = 'resize';
        var ROTATE = 'rotate'; // This constant is not simply an event
        var ABSOLUTE = 'absolute';
        var RELATIVE = 'relative';
        var HIDDEN = 'hidden';
        var DISPLAY = 'display';
        var BLOCK = 'block';
        var NONE = 'none';
        var TOP = 'top';
        var LEFT = 'left';
        var HEIGHT = 'height';
        var WIDTH = 'width';
        var CURSOR = 'cursor';
        var TRANSFORM = 'transform';
        var CSS_ROTATE = 'rotate({0}deg)';
        var CSS_SCALE = 'scale({0})';
        var DATA_UID = kendo.attr('uid');
        var DATA_TOOL = kendo.attr('tool');
        var DATA_COMMAND = kendo.attr('command');
        var DOT = '.';
        var DIV = '<div />';
        var DIV_W_CLASS = '<div class="{0}"></div>';
        var WIDGET_CLASS = 'k-widget kj-stage';
        var WRAPPER = kendo.format(DIV_W_CLASS, WIDGET_CLASS);
        var ELEMENT_CLASS = 'kj-element';
        var ELEMENT = '<div ' + DATA_UID + '="{0}" ' + DATA_TOOL + '="{1}" class="' + ELEMENT_CLASS + '"></div>';
        var ELEMENT_SELECTOR = DOT + ELEMENT_CLASS + '[' + DATA_UID + '="{0}"]';
        var OVERLAY_CLASS = 'kj-overlay';
        var HANDLE_BOX_CLASS = 'kj-handle-box';
        var HANDLE_BOX = kendo.format(DIV_W_CLASS, HANDLE_BOX_CLASS);
        var HANDLE_BOX_SELECTOR = DOT + HANDLE_BOX_CLASS + '[' + DATA_UID + '="{0}"]';
        var HANDLE_CLASS = 'kj-handle';
        var HANDLE_MOVE = '<span class="' + HANDLE_CLASS + '" ' + DATA_COMMAND + '="move"></span>';
        var HANDLE_RESIZE = '<span class="' + HANDLE_CLASS + '" ' + DATA_COMMAND + '="resize"></span>';
        var HANDLE_ROTATE = '<span class="' + HANDLE_CLASS + '" ' + DATA_COMMAND + '="rotate"></span>';
        var HANDLE_MENU = '<span class="' + HANDLE_CLASS + '" ' + DATA_COMMAND + '="menu"></span>';
        // var HANDLE_SELECTOR = '.kj-handle[' + DATA_COMMAND + '="{0}"]';
        var NOPAGE_CLASS = 'kj-nopage';
        var STATE = 'state';
        var COMMANDS = {
                MOVE: 'move',
                RESIZE: 'resize',
                ROTATE: 'rotate',
                MENU: 'menu'
            };
        var POINTER = 'pointer';
        var ACTIVE_TOOL = 'active';
        var DEFAULTS = {
                MODE: 'play',
                SCALE: 1,
                WIDTH: 1024,
                HEIGHT: 768
            };
        var DEBUG_MOUSE_CLASS = 'debug-mouse';
        var DEBUG_MOUSE_DIV = kendo.format(DIV_W_CLASS, DEBUG_MOUSE_CLASS);
        var DEBUG_BOUNDS_CLASS = 'debug-bounds';
        var DEBUG_BOUNDS = kendo.format(DIV_W_CLASS, DEBUG_BOUNDS_CLASS);
        var DEBUG_CENTER_CLASS = 'debug-center';
        var DEBUG_CENTER = '<div class="debug-center"></div>';


        /*********************************************************************************
         * Custom Bindings
         *********************************************************************************/

        /**
         * Enable binding the properties value of a Stage widget
         * @type {*|void}
         */
        binders.widget.properties = Binder.extend({
            init: function (widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);
                this.widget = widget;
                this._change = $.proxy(this.change, this);
                this.widget.bind(CHANGE, this._change);
            },
            change: function () {
                this.bindings.properties.set(this.widget.properties());
            },
            refresh: function () {
                this.widget.properties(this.bindings.properties.get());
            },
            destroy: function () {
                this.widget.unbind(CHANGE, this._change);
            }
        });

        /*********************************************************************************
         * Widget
         *********************************************************************************/

        /**
         * @class Stage Widget (kendoStage)
         */
        var Stage = Widget.extend({

            /**
             * Initializes the widget
             * @param element
             * @param options
             */
            init: function (element, options) {
                var that = this;
                Widget.fn.init.call(that, element, options);
                logger.debug('widget initialized');
                that.setOptions(options);
                that._layout();
                that._dataSource();
                kendo.notify(that);
            },

            /**
             * Widget modes
             */
            modes: {
                design: 'design',
                play: 'play',
                review: 'review'
            },

            /**
             * Widget events
             */
            events: [
                CHANGE,
                DATABINDING,
                DATABOUND,
                PROPERTYBINDING,
                PROPERTYBOUND,
                SELECT
            ],

            /**
             * Widget options
             */
            options: {
                name: 'Stage',
                autoBind: true,
                mode: DEFAULTS.MODE,
                scale: DEFAULTS.SCALE,
                height: DEFAULTS.HEIGHT,
                width: DEFAULTS.WIDTH,
                tools: kidoju.tools,
                dataSource: undefined,
                enable: false,
                readonly: false,
                messages: {
                    noPage: 'Please add or select a page'
                }
            },

            /**
             * @method setOptions
             * @param options
             */
            setOptions: function (options) {
                Widget.fn.setOptions.call(this, options);
                // TODO: we need to read scale, height and width both from styles and options and decide which wins
                this._mode = this.options.mode;
                this._scale = this.options.scale;
                this._height = this.options.height;
                this._width = this.options.width;
                this._disabled = this.options.enable;
                this._readonly = this.options.readonly;
            },

            /**
             * Mode defines the operating mode of the Stage Widget
             * @param value
             * @return {*}
             */
            mode: function (value) {
                var that = this;
                if ($.type(value) !== UNDEFINED) {
                    assert.type(STRING, value, kendo.format(assert.messages.type.default, 'value', STRING));
                    if ($.type(that.modes[value]) === UNDEFINED) {
                        throw new RangeError();
                    }
                    if (value !== that._mode) {
                        that._mode = value;
                        that._initializeMode();
                        that.refresh();
                    }
                }
                else {
                    return that._mode;
                }
            },

            /**
             * Scale the widget
             * @param value
             * @return {*}
             */
            scale: function (value) {
                var that = this;
                if (value !== undefined) {
                    if ($.type(value) !== NUMBER) {
                        throw new TypeError();
                    }
                    if (value < 0) {
                        throw new RangeError();
                    }
                    if (value !== that._scale) { // TODO: that.options.scale
                        that._scale = value;
                        that.wrapper.css({
                            transformOrigin: '0 0',
                            transform: kendo.format(CSS_SCALE, that._scale)
                        });
                        that.wrapper.find(DOT + HANDLE_CLASS).css({
                            // transformOrigin: 'center center', // by default
                            transform: kendo.format(CSS_SCALE, 1 / that._scale)
                        });
                    }
                }
                else {
                    return that._scale;
                }
            },

            /**
             * Height of stage
             * @param value
             * @returns {string}
             */
            height: function (value) {
                var that = this;
                if (value) {
                    if ($.type(value) !== NUMBER) {
                        throw new TypeError();
                    }
                    if (value < 0) {
                        throw new RangeError();
                    }
                    if (value !== that._height) {
                        that._height = value;
                    }
                }
                else {
                    return that._height;
                }
            },

            /**
             * Width of stage
             * @param value
             * @returns {string}
             */
            width: function (value) {
                var that = this;
                if (value) {
                    if ($.type(value) !== NUMBER) {
                        throw new TypeError();
                    }
                    if (value < 0) {
                        throw new RangeError();
                    }
                    if (value !== that._width) {
                        that._width = value;
                    }
                }
                else {
                    return that._width;
                }
            },

            /**
             * IMPORTANT: index is 0 based
             * @method index
             * @param index
             * @returns {*}
             */
            index: function (index) {
                var that = this;
                var component;
                if (index !== undefined) {
                    if ($.type(index) !== NUMBER || index % 1 !== 0) {
                        throw new TypeError();
                    } else if (index < 0 || (index > 0 && index >= that.length())) {
                        throw new RangeError();
                    } else {
                        component = that.dataSource.at(index);
                        that.value(component);
                    }
                } else {
                    component = that.dataSource.getByUid(that._selectedUid);
                    if (component instanceof PageComponent) {
                        return that.dataSource.indexOf(component);
                    } else {
                        return -1;
                    }
                }
            },

            /**
             * @method id
             * @param id
             * @returns {*}
             */
            id: function (id) {
                var that = this;
                var component;
                if (id !== undefined) {
                    if ($.type(id) !== NUMBER && $.type(id) !== STRING) {
                        throw new TypeError();
                    }
                    component = that.dataSource.get(id);
                    that.value(component);
                } else {
                    component = that.dataSource.getByUid(that._selectedUid);
                    if (component instanceof PageComponent) {
                        return component[component.idField];
                    }
                }
            },

            /* This function's cyclomatic complexity is too high. */
            /* jshint -W074 */

            /**
             * Gets/Sets the value of the selected component in the explorer
             * @method value
             * @param component
             * @returns {*}
             */
            value: function (component) {
                var that = this;
                if (component === NULL) {
                    if (that._selectedUid !== NULL) {
                        that._selectedUid = NULL;
                        logger.debug('selected component uid set to null');
                        that._toggleSelection();
                        that.trigger(CHANGE, {
                            index: undefined,
                            value: NULL
                        });
                    }
                } else if (component !== undefined) {
                    if (!(component instanceof PageComponent)) {
                        throw new TypeError();
                    }
                    // Note: when that.value() was previously named that.selection() with a custom binding
                    // the selection binding was executed before the source binding so we had to record the selected component
                    // in a temp variable (that._tmp) and assign it to the _selectedUid in the refresh method,
                    // that is after the source was bound.
                    // The corresponding code has now been removed after renaming that.selection() into that.value()
                    // because the value binding is executed after the source binding.
                    if (component.uid !== that._selectedUid && util.isGuid(component.uid)) {
                        var index = that.dataSource.indexOf(component);
                        if (index > -1) {
                            that._selectedUid = component.uid;
                            logger.debug('selected component uid set to ' + component.uid);
                            that._toggleSelection();
                            that.trigger(CHANGE, {
                                index: index,
                                value: component
                            });
                        }
                    }
                } else {
                    if (that._selectedUid === NULL) {
                        return NULL;
                    } else {
                        return that.dataSource.getByUid(that._selectedUid); // Returns undefined if not found
                    }
                }
            },

            /* jshint +W074 */

            /**
             * @method total()
             * @returns {*}
             */
            length: function () {
                return (this.dataSource instanceof PageComponentCollectionDataSource) ? this.dataSource.total() : -1;
            },

            /**
             * Properties
             * @param value
             * @returns {*}
             */
            properties: function (value) {
                var that = this;
                if (value) {
                    // if (!(value instanceof ObervableObject)) {
                    //    throw new TypeError();
                    // }
                    if (value !== that._properties) {
                        that._properties = value;
                    }
                }
                else {
                    return that._properties;
                }
            },

            /**
             * Changes the dataSource
             * @method setDataSource
             * @param dataSource
             */
            setDataSource: function (dataSource) {
                // set the internal data source equal to the one passed in by MVVM
                this.options.dataSource = dataSource;
                // rebuild the datasource if necessary, or just reassign
                this._dataSource();
            },

            /**
             * Binds the widget to the change event of the dataSource
             * See http://docs.telerik.com/kendo-ui/howto/create-custom-kendo-widget
             * @method _dataSource
             * @private
             */
            _dataSource: function () {
                var that = this;
                // if the DataSource is defined and the _refreshHandler is wired up, unbind because
                // we need to rebuild the DataSource

                // There is no reason why, in its current state, it would not work with any dataSource
                // if ( that.dataSource instanceof DataSource && that._refreshHandler ) {
                if (that.dataSource instanceof PageComponentCollectionDataSource && that._refreshHandler) {
                    that.dataSource.unbind(CHANGE, that._refreshHandler);
                }

                that._initializeMode();

                if (that.options.dataSource !== NULL) {  // use null to explicitly destroy the dataSource bindings

                    // returns the datasource OR creates one if using array or configuration object
                    that.dataSource = PageComponentCollectionDataSource.create(that.options.dataSource);

                    that._refreshHandler = $.proxy(that.refresh, that);

                    // bind to the change event to refresh the widget
                    that.dataSource.bind(CHANGE, that._refreshHandler);

                    if (that.options.autoBind) {
                        that.dataSource.fetch();
                    }
                }
            },

            /**
             * Builds the widget layout
             * @private
             */
            _layout: function () {
                var that = this;

                // Set that.stage from the div element that makes the widget
                that.stage = that.element
                    .wrap(WRAPPER)
                    .css({
                        position: RELATIVE,  // !important
                        overflow: HIDDEN,
                        height: that.height(),
                        width: that.width()
                    });

                // We need that.wrapper for visible/invisible bindings
                that.wrapper = that.stage.parent()
                    .css({
                        position: RELATIVE,  // !important
                        height: that.height(),
                        width: that.width(),
                        transformOrigin: '0 0', // 'top left', // !important without such attribute, element top left calculations are wrong
                        transform: kendo.format(CSS_SCALE, that.scale())
                    });
            },

            /**
             * Initialize mode
             * @private
             */
            _initializeMode: function () {

                var that = this;
                var modes = that.modes;
                var dataSource = that.options.dataSource;

                // Set mode
                that._toggleNoPageMessage(!dataSource);
                var readOnlyOverlay = !dataSource || that._disabled || that._readonly;
                that._toggleReadOnlyOverlay(readOnlyOverlay);
                var bindUserEntries = !!dataSource && that.mode() !== modes.design;
                that._togglePropertyBindings(bindUserEntries);
                var activeDesignMode = !!dataSource && that.mode() === modes.design && !that._disabled && !that._readonly;
                that._toggleHandleBox(activeDesignMode);
                that._toggleTransformEventHandlers(activeDesignMode);
                that._toggleContextMenu(activeDesignMode);
            },

            /**
             * Toggles a message when there is no page to display
             * @private
             */
            _toggleNoPageMessage: function (enable) {
                assert.instanceof($, this.wrapper, kendo.format(assert.messages.instanceof.default, 'this.wrapper', 'jQuery'));
                var wrapper = this.wrapper;

                // clear
                wrapper.children('.' + NOPAGE_CLASS).remove();

                // set no data message
                if (enable) {
                    $(DIV)
                        .addClass(NOPAGE_CLASS)
                        .text(this.options.messages.noPage)
                        .css({
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                        })
                        .appendTo(wrapper);
                }
            },

            /**
             * Toggles the readonly overlay
             * @param enable
             * @private
             */
            _toggleReadOnlyOverlay: function (enable) {
                assert.instanceof($, this.wrapper, kendo.format(assert.messages.instanceof.default, 'this.wrapper', 'jQuery'));
                var wrapper = this.wrapper;

                // clear
                wrapper.children('.' + OVERLAY_CLASS).remove();

                // set overlay
                if (enable) {
                    // Add overlay to disable all controls (including audio and video controls)
                    $(DIV)
                        .addClass(OVERLAY_CLASS)
                        .css({
                            position: ABSOLUTE,
                            display: BLOCK,
                            top: 0,
                            left: 0,
                            height: this.height(),
                            width: this.width()
                        })
                        .appendTo(wrapper);
                }
            },

            /**
             * Clear mode
             * @private
             */
            _clearMode: function () {
                // TODO: Possibly remove!!!!!!
                var that = this;
                if (that.stage instanceof $) {
                    // Unbind elements
                    $.each(that.stage.children(DOT + ELEMENT_CLASS), function (index, stageElement) {
                        kendo.destroy(stageElement);
                    });
                    that.stage.empty();
                }
            },

            /**
             * Toggle property bindings
             * @param enable
             * @private
             */
            _togglePropertyBindings: function (enable) {
                var that = this;

                // Unbind property bindings
                if ($.isFunction(that._propertyBinding)) {
                    that.unbind(PROPERTYBINDING, that._propertyBinding);
                }

                if (enable) {
                    // Bind properties
                    that._propertyBinding = $.proxy(function () {
                        var widget = this;
                        if (widget.properties() instanceof ObservableObject) {
                            $.each(widget.stage.children(DOT + ELEMENT_CLASS), function (index, stageElement) {
                                // kendo.unbind(stageElement); // kendo.bind does unbind
                                kendo.bind(stageElement, widget.properties());
                            });
                        }
                    }, that);
                    that.bind(PROPERTYBINDING, that._propertyBinding);
                }
            },

            /**
             * Toggle handle box
             * Note:
             * @param enable
             * @private
             */
            _toggleHandleBox: function (enable) {
                assert.instanceof($, this.wrapper, kendo.format(assert.messages.instanceof.default, 'this.wrapper', 'jQuery'));
                var that = this;
                var wrapper = that.wrapper;

                // Clear
                util.removeDebugVisualElements(wrapper);
                $(document).off(NS);
                wrapper.children(DOT + HANDLE_BOX_CLASS).remove();

                // Setup handles
                if (enable) {

                    // Add handles
                    $(HANDLE_BOX)
                        .css({
                            position: ABSOLUTE,
                            display: NONE
                        })
                        .append(HANDLE_MOVE)
                        .append(HANDLE_RESIZE)
                        .append(HANDLE_ROTATE)
                        .append(HANDLE_MENU)
                        .appendTo(wrapper);

                    // Add stage event handlers
                    $(document) // was that.wrapper
                        .on(MOUSEDOWN + NS + ' ' + TOUCHSTART + NS, $.proxy(that._onMouseDown, that))
                        .on(MOUSEMOVE + NS + ' ' + TOUCHMOVE + NS, $.proxy(that._onMouseMove, that))
                        .on(MOUSEUP + NS + ' ' + TOUCHEND + NS, $.proxy(that._onMouseUp, that));

                    // Add debug visual elements
                    util.addDebugVisualElements(wrapper);
                }
            },

            /**
             * Toggle transform event handlers
             * @param enable
             * @private
             */
            _toggleTransformEventHandlers: function (enable) {
                assert.instanceof($, this.stage, kendo.format(assert.messages.instanceof.default, 'this.stage', 'jQuery'));
                var that = this;
                var stage = that.stage;

                // Clear
                stage.off(NS);

                // Enable event handlers
                if (enable) {
                    stage
                        // .on(ENABLE + NS, DOT + ELEMENT_CLASS, $.proxy(that._enableStageElement, that))
                        .on(MOVE + NS, DOT + ELEMENT_CLASS, $.proxy(that._moveStageElement, that))
                        .on(RESIZE + NS, DOT + ELEMENT_CLASS, $.proxy(that._resizeStageElement, that))
                        .on(ROTATE + NS, DOT + ELEMENT_CLASS, $.proxy(that._rotateStageElement, that));
                }
            },

            /**
             * Event handler called when adding or triggered when enabling an element
             * @param e
             * @param component
             * @param enabled
             * @private
             */
            _enableStageElement: function (e, component, enabled) {
                var tools = this.options.tools;
                assert.instanceof(ObservableObject, tools, kendo.format(assert.messages.instanceof.default, 'this.options.tools', 'kendo.data.ObservableObject'));
                var tool = tools[component.tool];
                assert.instanceof(Tool, tool, kendo.format(assert.messages.instanceof.default, 'tool', 'kidoju.Tool'));
                if ($.isFunction(tool.onEnable)) {
                    tool.onEnable(e, component, enabled);
                }
            },

            /**
             * Event handler called when adding or triggered when moving an element
             * @param e
             * @param component
             * @private
             */
            _moveStageElement: function (e, component) {
                var tools = this.options.tools;
                assert.instanceof(ObservableObject, tools, kendo.format(assert.messages.instanceof.default, 'this.options.tools', 'kendo.data.ObservableObject'));
                var tool = tools[component.tool];
                assert.instanceof(Tool, tool, kendo.format(assert.messages.instanceof.default, 'tool', 'kidoju.Tool'));
                if ($.isFunction(tool.onMove)) {
                    tool.onMove(e, component);
                }
            },

            /**
             * Event handler called when adding or triggered when resizing an element
             * @param e
             * @param component
             * @private
             */
            _resizeStageElement: function (e, component) {
                var tools = this.options.tools;
                assert.instanceof(ObservableObject, tools, kendo.format(assert.messages.instanceof.default, 'this.options.tools', 'kendo.data.ObservableObject'));
                var tool = tools[component.tool];
                assert.instanceof(Tool, tool, kendo.format(assert.messages.instanceof.default, 'tool', 'kidoju.Tool'));
                if ($.isFunction(tool.onResize)) {
                    tool.onResize(e, component);
                }
            },

            /**
             * Event handler called when adding or triggered when rotating an element
             * @param e
             * @param component
             * @private
             */
            _rotateStageElement: function (e, component) {
                var tools = this.options.tools;
                assert.instanceof(ObservableObject, tools, kendo.format(assert.messages.instanceof.default, 'this.options.tools', 'kendo.data.ObservableObject'));
                var tool = tools[component.tool];
                assert.instanceof(Tool, tool, kendo.format(assert.messages.instanceof.default, 'tool', 'kidoju.Tool'));
                if ($.isFunction(tool.onRotate)) {
                    tool.onRotate(e, component);
                }
            },

            /**
             * Toggle context menu
             * @param enable
             * @private
             */
            _toggleContextMenu: function (enable) {
                var that = this;

                // CLear
                if (that.menu instanceof kendo.ui.ContextMenu) {
                    that.menu.destroy();
                    that.menu.element.remove();
                    that.menu = undefined;
                }

                // Add context menu
                if (enable) {
                    // See http://docs.telerik.com/kendo-ui/api/javascript/ui/contextmenu
                    that.menu = $('<ul class="kj-stage-menu"></ul>')
                        // .append('<li ' + DATA_COMMAND + '="lock">Lock</li>') // TODO Use constants + localize in messages
                        .append('<li ' + DATA_COMMAND + '="delete">Delete</li>')// TODO: Bring forward, Push backward, Edit, etc.....
                        .appendTo(that.wrapper)
                        .kendoContextMenu({
                            target: '.kj-handle[' + DATA_COMMAND + '="menu"]',
                            showOn: MOUSEDOWN + NS + ' ' + TOUCHSTART + NS,
                            select: $.proxy(that._contextMenuSelectHandler, that)
                        })
                        .data('kendoContextMenu');
                }
            },

            /**
             * Event handler for selecting an item in the context menu
             * @param e
             * @private
             */
            _contextMenuSelectHandler: function (e) {
                assert.isPlainObject(e, kendo.format(assert.messages.isPlainObject.default, 'e'));
                assert.instanceof($.Event, e.event, kendo.format(assert.messages.instanceof.default, 'e.event', 'jQuery.Event'));

                // TODO: Consider an event dispatcher so that the same commands can be called from toolbar
                // Check when implementing fonts, colors, etc....
                var that = this;
                switch ($(e.item).attr(DATA_COMMAND)) {
                    case 'lock':
                        break;
                    case 'delete':
                        var uid = that.wrapper.children(DOT + HANDLE_BOX_CLASS).attr(DATA_UID);
                        var item = that.dataSource.getByUid(uid);
                        that.dataSource.remove(item);
                        // This should raise the change event on the dataSource and call the refresh method of the widget
                        break;
                }

                // Close the menu
                if (that.menu instanceof kendo.ui.ContextMenu) {
                    that.menu.close();
                }

                // Event is handled, do not propagate
                e.preventDefault();
                // e.stopPropagation();
            },

            /**
             * Add an element onto the stage either on a click or from dataSource
             * @param component
             * @private
             */
            _addStageElement: function (component) {
                assert.instanceof(kendo.ui.Stage, this, kendo.format(assert.messages.instanceof.default, 'this', 'kendo.ui.Stage'));
                assert.instanceof($, this.stage, kendo.format(assert.messages.instanceof.default, 'this.stage', 'jQuery'));
                assert.instanceof(PageComponent, component, kendo.format(assert.messages.instanceof.default, 'component', 'kidoju.data.PageComponent'));
                assert.type(STRING, component.tool, kendo.format(assert.messages.type.default, 'component.tool', STRING));
                assert.type(NUMBER, component.left, kendo.format(assert.messages.type.default, 'component.left', NUMBER));
                assert.type(NUMBER, component.top, kendo.format(assert.messages.type.default, 'component.top', NUMBER));

                var that = this;
                var stage = that.stage;

                // Cannot add a stage element that already exists on stage
                if (stage.children(kendo.format(ELEMENT_SELECTOR, component.uid)).length > 0) {
                    return;
                }

                // Create stageElement
                var stageElement = $(kendo.format(ELEMENT, component.uid, component.tool))
                    .css({
                        position: ABSOLUTE,
                        top: component.get(TOP),
                        left: component.get(LEFT),
                        height: component.get(HEIGHT),
                        width: component.get(WIDTH),
                        // transformOrigin: 'center center', // by default
                        transform: kendo.format(CSS_ROTATE, component.get(ROTATE))
                    });

                // Update stageElement with component
                that._updateStageElement(stageElement, component);

                // Append to the stage
                stage.append(stageElement);
            },

            /**
             *
             * @param stageElement
             * @param component
             * @private
             */
            _updateStageElement: function (stageElement, component) {
                assert.instanceof($, stageElement, kendo.format(assert.messages.instanceof.default, 'stageElement', 'jQuery'));
                assert.instanceof(PageComponent, component, kendo.format(assert.messages.instanceof.default, 'component', 'kidoju.data.PageComponent'));
                assert.instanceof(kendo.ui.Stage, this, kendo.format(assert.messages.instanceof.default, 'this', 'kendo.ui.Stage'));
                assert.instanceof($, this.stage, kendo.format(assert.messages.instanceof.default, 'this.stage', 'jQuery'));
                assert.equal(component.uid, stageElement.attr(kendo.attr('uid')), 'The stageElement data-uid attribute is expected to equal the component uid');

                var tool = this.options.tools[component.tool];
                assert.instanceof(Tool, tool, kendo.format(assert.messages.instanceof.default, tool, 'kidoju.Tool'));
                var mode = this.mode();
                assert.enum(Object.keys(kendo.ui.Stage.fn.modes), mode, kendo.format(assert.messages.enum.default, 'mode', Object.keys(kendo.ui.Stage.fn.modes)));
                var content =  tool.getHtmlContent(component, mode);
                if (!(content instanceof $)) {
                    assert.type(STRING, content, kendo.format(assert.messages.type.default, 'tool.getHtmlContent(...)', STRING));
                    content = $(content);
                }

                // Empty stage element
                // stageElement.unbind();
                kendo.destroy(stageElement);
                stageElement.empty();

                // Append content
                stageElement.append(content);

                // In case stageElement is made from kendo UI controls
                kendo.init(stageElement);

                // We cannot trigger transform event handlers on stage elements
                // because they are not yet added to the stage to which events are delegated
                // Calling event handlers without raising events here as another benefit:
                // We only need the event handlers in design mode - see _toggleTransformEventHandlers
                /*
                stageElement.trigger(ENABLE + NS, component);
                stageElement.trigger(MOVE + NS, component);
                stageElement.trigger(RESIZE + NS, component);
                stageElement.trigger(ROTATE + NS, component);
                */
                this._enableStageElement({
                    currentTarget: stageElement,
                    preventDefault: $.noop,
                    stopPropagation: $.noop
                }, component, this.mode() === this.modes.play);
                this._moveStageElement({
                    currentTarget: stageElement,
                    preventDefault: $.noop,
                    stopPropagation: $.noop
                }, component);
                this._resizeStageElement({
                    currentTarget: stageElement,
                    preventDefault: $.noop,
                    stopPropagation: $.noop
                }, component);
                this._rotateStageElement({
                    currentTarget: stageElement,
                    preventDefault: $.noop,
                    stopPropagation: $.noop
                }, component);
            },

            /**
             * Remove an element from the stage
             * @param uid
             * @private
             */
            _removeStageElementByUid: function (uid) {

                // TODO use a tool method to avoid leaks (remove all event handlers, ...)

                // Find and remove stage element
                var stageElement = this.stage.children(kendo.format(ELEMENT_SELECTOR, uid));
                kendo.unbind(stageElement);
                stageElement
                    .off(NS)
                    .remove();
            },

            /**
             * Show handles on a stage element
             * @method _showHandles
             * @param uid
             * @private
             */
            _showHandles: function (uid) {
                var that = this;
                var handleBox = that.wrapper.children(DOT + HANDLE_BOX_CLASS);
                if (handleBox.length) {

                    // Position handleBox on top of stageElement (same location, same size, same rotation)
                    var stageElement = that.stage.children(kendo.format(ELEMENT_SELECTOR, uid));
                    handleBox
                        .css({
                            top: stageElement.css(TOP),
                            left: stageElement.css(LEFT),
                            height: stageElement.css(HEIGHT),
                            width: stageElement.css(WIDTH),
                            // transformOrigin: 'center center', // by default
                            transform: stageElement.css(TRANSFORM), // This might return a matrix
                            display: BLOCK
                        })
                        .attr(DATA_UID, uid); // This is how we know which stageElement to transform when dragging handles

                    // Scale and rotate handles
                    handleBox.children(DOT + HANDLE_CLASS)
                        .css({
                            // transformOrigin: 'center center', // by default
                            transform: kendo.format(CSS_ROTATE, -util.getTransformRotation(stageElement)) + ' ' + kendo.format(CSS_SCALE, 1 / that.scale())
                        });
                }
            },

            /**
             * Hide handles
             * @method _hideHandles
             * @private
             */
            _hideHandles: function () {
                this.wrapper.children(DOT + HANDLE_BOX_CLASS)
                    .css({ display: NONE })
                    .removeAttr(DATA_UID);
            },

            /**
             * Start dragging an element
             * @param e
             * @private
             */
            // This function's cyclomatic complexity is too high.
            /* jshint -W074 */
            _onMouseDown: function (e) {
                assert.instanceof($.Event, e, kendo.format(assert.messages.instanceof.default, 'e', 'jQuery.Event'));
                assert.instanceof(kendo.ui.Stage, this, kendo.format(assert.messages.instanceof.default, 'this', 'kendo.ui.Stage'));

                var that = this;
                var tools = that.options.tools;
                var activeToolId = tools.get(ACTIVE_TOOL);
                var target = $(e.target);
                var mouse = util.getMousePosition(e, that.stage);
                var stageElement = target.closest(DOT + ELEMENT_CLASS);
                var handle = target.closest(DOT + HANDLE_CLASS);
                var uid;

                // Close any context menu left opened if not selecting a menu item
                if (that.menu instanceof kendo.ui.ContextMenu && !target.is('.k-link')) {
                    that.menu.close();
                }

                if (activeToolId !== POINTER) {

                    // When clicking the stage with an active tool, add a new element
                    var tool = tools[activeToolId];
                    assert.instanceof(Tool, tool, kendo.format(assert.messages.instanceof.default, 'tool', 'kidoju.Tool'));
                    var scale = util.getTransformScale(that.wrapper);
                    var left = mouse.x / scale;
                    var top = mouse.y / scale;

                    // Check that the mousedown occured within the boundaries of the stage
                    if (left >= 0 && left <= this.stage.width() && top >= 0 && top <= this.stage.height()) {

                        var item = new PageComponent({
                            // id: kendo.guid(),
                            tool: tool.id,
                            left: left,
                            top: top,
                            width: tool.width,
                            height: tool.height
                            // rotate: tool.rotate?
                        });
                        that.dataSource.add(item);
                        // Add triggers the change event on the dataSource which calls the refresh method

                        tools.set(ACTIVE_TOOL, POINTER);

                    }

                    e.preventDefault(); // otherwise both touchstart and mousedown are triggered and code is executed twice
                    e.stopPropagation();

                } else if (handle.length) {

                    // When hitting a handle with the pointer tool
                    var command = handle.attr(DATA_COMMAND);
                    if (command === COMMANDS.MENU) {
                        $.noop(); // TODO: contextual menu here
                    } else {
                        var handleBox = that.wrapper.children(DOT + HANDLE_BOX_CLASS);
                        uid = handleBox.attr(DATA_UID); // the uid of the stageElement which is being selected before hitting the handle
                        stageElement = that.stage.children(kendo.format(ELEMENT_SELECTOR, uid));
                        handleBox.data(STATE, {
                            command: command,
                            top: parseFloat(stageElement.css(TOP)) || 0, // stageElement.position().top does not work when scaled
                            left: parseFloat(stageElement.css(LEFT)) || 0, // stageElement.position().left does not work when scaled
                            height: stageElement.height(),
                            width: stageElement.width(),
                            angle: util.getTransformRotation(stageElement),
                            scale: util.getTransformScale(that.wrapper),
                            snapGrid: 0, // TODO
                            snapAngle: 0, // TODO
                            mouseX: mouse.x,
                            mouseY: mouse.y,
                            uid: uid
                        });

                        // log(handleBox.data(STATE));
                        $(document.body).css(CURSOR, target.css(CURSOR));
                    }
                    e.preventDefault(); // otherwise both touchstart and mousedown are triggered and code is executed twice
                    e.stopPropagation();

                } else if (stageElement.length || target.is(DOT + HANDLE_BOX_CLASS)) {
                    // When hitting a stage element or the handle box with the pointer tool
                    uid = stageElement.attr(DATA_UID);
                    if (util.isGuid(uid)) {
                        var component = that.dataSource.getByUid(uid);
                        if (component instanceof PageComponent) {
                            that.value(component);
                        }
                    }

                } else if (that.wrapper.find(target).length) {

                    // When hitting anything else in the wrapper with the pointer tool
                    that.value(NULL);
                    e.preventDefault(); // otherwise both touchstart and mousedown are triggered and code is executed twice
                    e.stopPropagation();

                }

                // Otherwise, let the event propagate
            },
            /* jshint +W074 */

            /**
             * While dragging an element on stage
             * @param e
             * @private
             */
            _onMouseMove: function (e) {
                assert.instanceof($.Event, e, kendo.format(assert.messages.instanceof.default, 'e', 'jQuery.Event'));
                assert.instanceof(kendo.ui.Stage, this, kendo.format(assert.messages.instanceof.default, 'this', 'kendo.ui.Stage'));
                var that = this;
                var handleBox = that.wrapper.children(DOT + HANDLE_BOX_CLASS);
                var startState = handleBox.data(STATE);

                // With a startState, we are dragging a handle
                if ($.isPlainObject(startState)) {

                    var mouse = util.getMousePosition(e, that.stage);
                    var stageElement = that.stage.children(kendo.format(ELEMENT_SELECTOR, startState.uid));
                    var item = that.dataSource.getByUid(startState.uid);
                    var rect = stageElement[0].getBoundingClientRect();
                    var bounds = {
                            // TODO these calculations depend on the transformOrigin attribute of that.wrapper - ideally we should introduce transformOrigin in the calculation
                            left: rect.left - that.stage.offset().left + $(that.stage.get(0).ownerDocument).scrollLeft(),
                            top: rect.top - that.stage.offset().top + $(that.stage.get(0).ownerDocument).scrollTop(),
                            height: rect.height,
                            width: rect.width
                        };
                    var center = {
                            x: bounds.left + bounds.width / 2,
                            y: bounds.top + bounds.height / 2
                        };

                    util.updateDebugVisualElements({
                        wrapper: that.wrapper,
                        mouse: mouse,
                        center: center,
                        bounds: bounds,
                        scale: startState.scale
                    });

                    if (startState.command === COMMANDS.MOVE) {
                        item.set(LEFT, util.snap(startState.left + (mouse.x - startState.mouseX) / startState.scale, startState.snapGrid));
                        item.set(TOP, util.snap(startState.top + (mouse.y - startState.mouseY) / startState.scale, startState.snapGrid));
                        // Set triggers the change event on the dataSource which calls the refresh method to update the stage

                    } else if (startState.command === COMMANDS.RESIZE) {
                        // See https://github.com/Memba/Kidoju-Widgets/blob/master/test/samples/move-resize-rotate.md
                        var dx = (mouse.x - startState.mouseX) / startState.scale; // horizontal distance from S to S'
                        var dy = (mouse.y - startState.mouseY) / startState.scale; // vertical distance from S to S'
                        var centerAfterMove = { // Also C'
                                x: center.x + dx / 2,
                                y: center.y + dy / 2
                            };
                        var topLeft = { // Also T
                                x: startState.left,
                                y: startState.top
                            };
                        var alpha = util.deg2rad(startState.angle);
                        var mmprime = util.getRotatedPoint(topLeft, center, alpha); // Also M=M'
                        var topLeftAfterMove = util.getRotatedPoint(mmprime, centerAfterMove, -alpha); // Also T'

                        // TODO these calculations depend on the transformOrigin attribute of that.wrapper - ideally we should introduce transformOrigin in the calculation
                        item.set(LEFT, topLeftAfterMove.x);
                        item.set(TOP, topLeftAfterMove.y);
                        item.set(HEIGHT, util.snap(startState.height - dx * Math.sin(alpha) + dy * Math.cos(alpha), startState.snapGrid));
                        item.set(WIDTH, util.snap(startState.width + dx * Math.cos(alpha) + dy * Math.sin(alpha), startState.snapGrid));
                        // Set triggers the change event on the dataSource which calls the refresh method to update the stage

                    } else if (startState.command === COMMANDS.ROTATE) {
                        var rad = util.getRadiansBetween2Points(center, {
                                x: startState.mouseX,
                                y: startState.mouseY
                            }, mouse);
                        var deg = util.snap((360 + startState.angle + util.rad2deg(rad)) % 360, startState.snapAngle);
                        item.set(ROTATE, deg);
                        // Set triggers the change event on the dataSource which calls the refresh method to update the stage
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            },

            /**
             * At the end of dragging an element on stage
             * @param e
             * @private
             */
            _onMouseUp: function (e) {
                assert.instanceof($.Event, e, kendo.format(assert.messages.instanceof.default, 'e', 'jQuery.Event'));
                assert.instanceof(kendo.ui.Stage, this, kendo.format(assert.messages.instanceof.default, 'this', 'kendo.ui.Stage'));
                var that = this;
                var handleBox = that.wrapper.children(DOT + HANDLE_BOX_CLASS);
                var startState = handleBox.data(STATE);

                if ($.isPlainObject(startState)) {

                    // Remove drag start state
                    handleBox.removeData(STATE);

                    // Reset cursor
                    $(document.body).css(CURSOR, '');

                    // Hide debug visual elements
                    util.hideDebugVisualElements(that.wrapper);

                }
            },

            /**
             *
             * @param options
             * @private
             */
            _editable: function (options) {
                var that = this;
                var disabled = that._disabled = options.disabled;
                var readonly = that._readonly = options.readonly;
                var wrapper = that.wrapper;

                // Clear


                // Set
                if (!disabled && !readonly) {

                } else {

                }

                // TODO iterate through components and call onEnable
            },

            /**
             * Enable/disable the widget
             * @param enable
             */
            enable: function (enable) {
                this._editable({
                    readonly: false,
                    disable: !(enable = enable === undefined ? true : enable)
                });
            },

            /**
             * Make the widget readonly
             * @param readonly
             */
            readonly: function (readonly) {
                this._editable({
                    readonly: readonly === undefined ? true : readonly,
                    disable: false
                });
            },

            /**
             * Refresh a stage widget
             * @param e
             */
            // This function's cyclomatic complexity is too high.
            /* jshint -W074 */
            refresh: function (e) {
                var that = this;
                if (e === undefined || e.action === undefined) {
                    var components = [];
                    if (e === undefined && that.dataSource instanceof PageComponentCollectionDataSource) {
                        components = that.dataSource.data();
                    } else if (e && e.items instanceof ObservableArray) {
                        components = e.items;
                    }
                    that._hideHandles();
                    that.trigger(DATABINDING);
                    $.each(that.stage.children(DOT + ELEMENT_CLASS), function (index, stageElement) {
                        that._removeStageElementByUid($(stageElement).attr(DATA_UID));
                    });
                    $.each(components, function (index, component) {
                        that._addStageElement(component);
                    });

                    // If the following line triggers `Uncaught TypeError: Cannot read property 'length' of null` in the console
                    // This is probably because binding on properties has not been properly set - check html
                    // as in <input type="text" style="width: 300px; height: 100px; font-size: 75px;" data-bind="value: ">
                    that.trigger(DATABOUND);

                    // We can only bind properties after all dataBound event handlers have executed
                    // otherwise there is a mix of binding sources
                    that.trigger(PROPERTYBINDING); // This calls an event handler in _initializePlayMode
                    that.trigger(PROPERTYBOUND);

                } else if (e.action === 'add') {
                    $.each(e.items, function (index, component) {
                        that._addStageElement(component);
                        that.value(component);
                    });

                } else if (e.action === 'remove') {
                    $.each(e.items, function (index, component) {
                        that._removeStageElementByUid(component.uid);
                        that.trigger(CHANGE, { action: e.action, value: component });
                        if (that.wrapper.children(DOT + HANDLE_BOX_CLASS).attr(DATA_UID) === component.uid) {
                            that.value(NULL);
                        }
                    });

                } else if (e.action === 'itemchange') {
                    $.each(e.items, function (index, component) {
                        var stageElement = that.stage.children(kendo.format(ELEMENT_SELECTOR, component.uid));
                        var handleBox = that.wrapper.children(kendo.format(HANDLE_BOX_SELECTOR, component.uid));
                        if (stageElement.length) {
                            switch (e.field) {
                                case LEFT:
                                    stageElement.css(LEFT, component.left);
                                    handleBox.css(LEFT, component.left);
                                    stageElement.trigger(MOVE + NS, component);
                                    break;
                                case TOP:
                                    stageElement.css(TOP, component.top);
                                    handleBox.css(TOP, component.top);
                                    stageElement.trigger(MOVE + NS, component);
                                    break;
                                case HEIGHT:
                                    stageElement.css(HEIGHT, component.height);
                                    handleBox.css(HEIGHT, component.height);
                                    stageElement.trigger(RESIZE + NS, component);
                                    break;
                                case WIDTH:
                                    stageElement.css(WIDTH, component.width);
                                    handleBox.css(WIDTH, component.width);
                                    stageElement.trigger(RESIZE + NS, component);
                                    break;
                                case ROTATE:
                                    stageElement
                                        .css(TRANSFORM, kendo.format(CSS_ROTATE, component.rotate));
                                    handleBox
                                        .css(TRANSFORM, kendo.format(CSS_ROTATE, component.rotate));
                                    handleBox.children(DOT + HANDLE_CLASS)
                                        .css(TRANSFORM, kendo.format(CSS_ROTATE, -component.rotate) + ' ' + kendo.format(CSS_SCALE, 1 / that.scale()));
                                    stageElement.trigger(ROTATE + NS, component);
                                    break;
                                default:
                                    if (/^attributes/.test(e.field) || /^properties/.test(e.field)) {
                                        that._updateStageElement(stageElement, component);
                                    }
                            }
                        }
                    });
                }
            },
            /* jshint +W074 */

            /**
             * Toggle the selection
             * @returns {h|*}
             */
            _toggleSelection: function () {
                assert.instanceof(kendo.ui.Stage, this, kendo.format(assert.messages.instanceof.default, 'this', 'kendo.ui.Stage'));
                var that = this;
                var uid = that._selectedUid;
                var handleBox = that.wrapper.children(DOT + HANDLE_BOX_CLASS);
                // if (that.mode() === that.modes.design) {
                if (handleBox.length) {
                    var stageElement = that.stage.children(kendo.format(ELEMENT_SELECTOR, uid));
                    if (util.isGuid(uid) && stageElement.length && handleBox.attr(DATA_UID) !== uid) {
                        that._showHandles(uid);
                        // select(null) should clear the selection
                    } else if (uid === NULL && handleBox.css(DISPLAY) !== NONE) {
                        that._hideHandles();
                    }
                }
            },

            /**
             * Stage Elements
             * @method items
             * @returns {XMLList|*}
             */
            items: function () {
                return this.element[0].children;
            },

            /**
             * Clears the DOM from modifications made by the widget
             * @private
             */
            _clear: function () {
                var that = this;
                // clear mode
                that._clearMode();
                // unbind kendo
                kendo.unbind(that.element);
                // unbind all other events
                that.element.find('*').off();
                // empty and unwrap
                that.element
                    .off()
                    .empty()
                    .unwrap();
            },

            /**
             * Destroys the widget
             */
            destroy: function () {
                var that = this;
                Widget.fn.destroy.call(that);
                that._clear();
                that.setDataSource(NULL);
                kendo.destroy(that.element);
            }

        });

        kendo.ui.plugin(Stage);

        /*********************************************************************************
         * Helpers
         *********************************************************************************/

        /**
         * Utility functions
         */
        var util = {

            /**
             * Test valid guid
             * @param value
             * @returns {boolean}
             */
            isGuid: function (value) {
                // http://stackoverflow.com/questions/7905929/how-to-test-valid-uuid-guid
                return ($.type(value) === STRING) && (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value));
            },

            /**
             * Convert radians to degrees
             * @param deg
             * @returns {number}
             */
            deg2rad: function (deg) {
                return deg * Math.PI / 180;
            },

            /**
             * Convert degrees to radians
             * @param rad
             * @returns {number}
             */
            rad2deg: function (rad) {
                return rad * 180 / Math.PI;
            },

            /**
             * Snapping consists in rounding the value to the closest multiple of snapValue
             * @param value
             * @param snapValue
             * @returns {*}
             */
            snap: function (value, snapValue) {
                if (snapValue) {
                    return value % snapValue < snapValue / 2 ? value - value % snapValue : value + snapValue - value % snapValue;
                } else {
                    return value;
                }
            },

            /**
             * Get the rotation angle (in degrees) of an element's CSS transformation
             * @param element
             * @returns {Number|number}
             */
            getTransformRotation: function (element) {
                // $(element).css('transform') returns a matrix, so we have to read the style attribute
                var match = ($(element).attr('style') || '').match(/rotate\([\s]*([0-9\.]+)[deg\s]*\)/);
                return $.isArray(match) && match.length > 1 ? parseFloat(match[1]) || 0 : 0;
            },

            /**
             * Get the scale of an element's CSS transformation
             * @param element
             * @returns {Number|number}
             */
            getTransformScale: function (element) {
                // $(element).css('transform') returns a matrix, so we have to read the style attribute
                var match = ($(element).attr('style') || '').match(/scale\([\s]*([0-9\.]+)[\s]*\)/);
                return $.isArray(match) && match.length > 1 ? parseFloat(match[1]) || 1 : 1;
            },

            /**
             * Get the mouse (or touch) position
             * @param e
             * @param stage
             * @returns {{x: *, y: *}}
             */
            getMousePosition: function (e, stage) {
                // See http://www.jacklmoore.com/notes/mouse-position/
                // See http://www.jqwidgets.com/community/topic/dragend-event-properties-clientx-and-clienty-are-undefined-on-ios/
                // See http://www.devinrolsen.com/basic-jquery-touchmove-event-setup/
                // ATTENTION: e.originalEvent.touches instanceof TouchList, not Array
                var clientX = e.originalEvent && e.originalEvent.touches ? e.originalEvent.touches[0].clientX : e.clientX;
                var clientY = e.originalEvent && e.originalEvent.touches ? e.originalEvent.touches[0].clientY : e.clientY;
                // IMPORTANT: Position is relative to the stage and e.offsetX / e.offsetY do not work in Firefox
                // var stage = $(e.target).closest('.kj-stage').find(kendo.roleSelector('stage'));
                var mouse = {
                        x: clientX - stage.offset().left + $(stage.get(0).ownerDocument).scrollLeft(),
                        y: clientY - stage.offset().top + $(stage.get(0).ownerDocument).scrollTop()
                    };
                return mouse;
            },

            /**
             * Rotate a point by an angle around a center
             * @param point
             * @param center
             * @param radians
             * @returns {*}
             */
            getRotatedPoint: function (point, center, radians) {
                if ($.isPlainObject(point) && $.type(point.x) === 'number' && $.type(point.y) === 'number' &&
                    $.isPlainObject(center) && $.type(center.x) === 'number' && $.type(center.y) === 'number' &&
                    $.type(radians) === 'number') {
                    return {
                        // See http://stackoverflow.com/questions/786472/rotate-a-point-by-another-point-in-2d
                        // See http://www.felixeve.co.uk/how-to-rotate-a-point-around-an-origin-with-javascript/
                        x: center.x + (point.x - center.x) * Math.cos(radians) - (point.y - center.y) * Math.sin(radians),
                        y: center.y + (point.x - center.x) * Math.sin(radians) + (point.y - center.y) * Math.cos(radians)
                    };
                }
            },

            /**
             * Calculate the angle between two points rotated around a center
             * @param center
             * @param p1
             * @param p2
             * @returns {*}
             */
            getRadiansBetween2Points: function (center, p1, p2) {
                if ($.isPlainObject(center) && $.type(center.x) === 'number' && $.type(center.y) === 'number' &&
                    $.isPlainObject(p1) && $.type(p1.x) === 'number' && $.type(p1.y) === 'number' &&
                    $.isPlainObject(p2) && $.type(p2.x) === 'number' && $.type(p2.y) === 'number') {
                    // See http://www.euclideanspace.com/maths/algebra/vectors/angleBetween/
                    // See http://stackoverflow.com/questions/7586063/how-to-calculate-the-angle-between-a-line-and-the-horizontal-axis
                    // See http://code.tutsplus.com/tutorials/euclidean-vectors-in-flash--active-8192
                    // See http://gamedev.stackexchange.com/questions/69649/using-atan2-to-calculate-angle-between-two-vectors
                    return Math.atan2(p2.y - center.y, p2.x - center.x) - Math.atan2(p1.y - center.y, p1.x - center.x);
                }
            },

            /**
             * Add debug visual eleemnts
             * @param wrapper
             */
            addDebugVisualElements: function (wrapper) {
                if (window.app && window.app.DEBUG) {

                    // Add bounding rectangle
                    $(DEBUG_BOUNDS)
                        .css({
                            position: ABSOLUTE,
                            border: '1px dashed #FF00FF',
                            display: NONE
                        })
                        .appendTo(wrapper);

                    // Add center of rotation
                    $(DEBUG_CENTER)
                        .css({
                            position: ABSOLUTE,
                            height: '20px',
                            width: '20px',
                            marginTop: '-10px',
                            marginLeft: '-10px',
                            borderRadius: '50%',
                            backgroundColor: '#FF00FF',
                            display: NONE
                        })
                        .appendTo(wrapper);

                    // Add calculated mouse position
                    $(DEBUG_MOUSE_DIV)
                        .css({
                            position: ABSOLUTE,
                            height: '20px',
                            width: '20px',
                            marginTop: '-10px',
                            marginLeft: '-10px',
                            borderRadius: '50%',
                            backgroundColor: '#00FFFF',
                            display: NONE
                        })
                        .appendTo(wrapper);
                }
            },

            /**
             * Update debug visual elements
             * @param options
             */
            updateDebugVisualElements: function (options) {
                if (window.app && window.app.DEBUG && $.isPlainObject(options) && options.scale > 0) {

                    // Display center of rotation
                    options.wrapper.children(DOT + DEBUG_CENTER_CLASS).css({
                        display: 'block',
                        left: options.center.x / options.scale,
                        top: options.center.y / options.scale
                    });

                    // Display bounding rectangle
                    options.wrapper.children(DOT + DEBUG_BOUNDS_CLASS).css({
                        display: 'block',
                        left: options.bounds.left / options.scale,
                        top: options.bounds.top / options.scale,
                        height: options.bounds.height / options.scale,
                        width: options.bounds.width / options.scale
                    });

                    // Display mouse calculated position
                    options.wrapper.children(DOT + DEBUG_MOUSE_CLASS).css({
                        display: 'block',
                        left: options.mouse.x / options.scale,
                        top: options.mouse.y / options.scale
                    });
                }
            },

            /**
             * Hide debug visual elements
             * @param wrapper
             */
            hideDebugVisualElements: function (wrapper) {
                if (window.app && window.app.DEBUG) {
                    wrapper.children(DOT + DEBUG_CENTER_CLASS).css({ display: NONE });
                    wrapper.children(DOT + DEBUG_BOUNDS_CLASS).css({ display: NONE });
                    wrapper.children(DOT + DEBUG_MOUSE_CLASS).css({ display: NONE });
                }
            },

            /**
             * Remove debug visual elements
             * @param wrapper
             */
            removeDebugVisualElements: function (wrapper) {
                if (window.app && window.app.DEBUG) {
                    wrapper.children(DOT + DEBUG_CENTER_CLASS).remove();
                    wrapper.children(DOT + DEBUG_BOUNDS_CLASS).remove();
                    wrapper.children(DOT + DEBUG_MOUSE_CLASS).remove();
                }
            }
        };

    }(window.jQuery));

    /* jshint +W071 */

    return window.kendo;

}, typeof define === 'function' && define.amd ? define : function (_, f) { 'use strict'; f(); });
