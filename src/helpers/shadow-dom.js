import React, { Component, PropTypes, createElement } from 'react';
import { render, findDOMNode } from 'react-dom';
import { dissoc } from 'ramda';

/**
 * @class ShadowDOM
 * @extends Component
 */
export default class ShadowDOM extends Component {

    /**
     * @constant propTypes
     * @type {Object}
     */
    static propTypes = {
        component: PropTypes.node.isRequired,
        cssDocuments: PropTypes.oneOfType([PropTypes.string, PropTypes.array])
    };

    /**
     * @constructor
     */
    constructor() {
        super();
        this.state = { resolving: false };
    }

    /**
     * @method componentWillMount
     * @return {void}
     */
    componentWillMount() {

        const container = (() => {

            // Wrap children in a container if it's an array of children, otherwise
            // simply render the single child which is a valid `ReactElement` instance.
            const children = this.props.component.props.children;
            return children.length ? <main>{children}</main> : children;

        })();

        this.setState({ container });

    }

    /**
     * @method componentDidMount
     * @return {void}
     */
    componentDidMount() {

        // Create the shadow root and take the CSS documents from props.
        const shadowRoot = findDOMNode(this).attachShadow({ mode: 'open' });
        const cssDocuments = this.props.cssDocuments;
        const container = this.state.container;

        // Render the passed in component to the shadow root, and then `setState` if there
        // are no CSS documents to be resolved.
        render(container, shadowRoot);
        !cssDocuments && this.setState({ shadowRoot, container });

        if (cssDocuments.length) {

            // Otherwise we'll fetch and attach the passed in stylesheets which need to be
            // resolved before `state.resolved` becomes `true` again.
            this.setState({ resolving: true, shadowRoot, container });
            this.attachStylesheets(this.props.cssDocuments);

        }

    }

    /**
     * @method componentDidUpdate
     * @return {void}
     */
    componentDidUpdate() {

        // Updates consist of simply rendering the container element into the shadow root
        // again, as the `this.state.container` element contains the passed in component's
        // children.
        render(this.state.container, this.state.shadowRoot);

    }

    /**
     * @method attachStylesheets
     * @param cssDocuments {Array|String}
     * @return {void}
     */
    attachStylesheets(cssDocuments) {

        const styleElement = document.createElement('style');
        styleElement.setAttribute('type', 'text/css');
        const documents = Array.isArray(cssDocuments) ? cssDocuments : [cssDocuments];

        if (!documents.length) {
            return;
        }

        /**
         * @method fetchStylesheet
         * @param {String} document
         * @return {Promise}
         */
        const fetchStylesheet = document => fetch(document).then(response => response.text());

        /**
         * @method insertStyleElement
         * @param {Array} cssDocuments
         * @return {void}
         */
        const insertStyleElement = cssDocuments => {

            styleElement.innerHTML = cssDocuments.reduce((accumulator, document) => {
                return `${accumulator} ${document}`;
            });

            this.state.shadowRoot.appendChild(styleElement);

        };

        Promise.all(documents.map(fetchStylesheet)).then(cssDocuments => {
            insertStyleElement(cssDocuments);
            this.setState({ resolving: false });
        });

    }

    /**
     * @method render
     * @return {XML}
     */
    render() {

        // Take all of the props from the passed in component, minus the `children` props
        // as that's handled by `componentDidMount`.
        const props = dissoc('children', this.props.component.props);
        const className = this.state.resolving ? 'resolving' : 'resolved';

        // Note that when we're rendering a dynamic-named element `className` is lower-cased.
        // See: https://github.com/facebook/react/issues/4933
        return <this.props.component.type {...dissoc('className', props)} class={`${props.className} ${className}`.trim()} />;

    }

}
