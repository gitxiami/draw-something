import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import * as networkActions from 'actions/network';
import wsAction from "../utils/wsAction";

@connect(
    state => ({
        loadingStatus: state.network.loadingStatus,
        webSocketStatus: state.network.webSocketStatus,
        user: state.user
    }),
    dispatch => bindActionCreators({...networkActions}, dispatch)
)
export default class Header extends Component {
    static defaultProps = {
        type: '',
    };
    state = {
        nameEditable: false,
        nameValue: '',
    };
    render () {
        const { loadingStatus, webSocketStatus, loading, loaded, wsConnect, wsDisconnect, user, title, type } = this.props;

        let typeNode = (type) => {
            switch (type) {
                case 'home':
                    return (
                        <a href="#">
                            <svg className="icon" aria-hidden="true">
                                <use xlinkHref="#icon-home"></use>
                            </svg>
                        </a>
                    );
                case 'room':
                    return (
                        <Link to={'/'}>
                            <svg className="icon" aria-hidden="true">
                                <use xlinkHref="#icon-exit"></use>
                            </svg>
                        </Link>
                    );
                default:
                    return null;
            }
        };
        return (
            <section className="fixed-header">
                <div className="item left">
                    <span>
                        { typeNode(type) }
                    </span>
                    <span>
                        { type === 'room' ? `房间[${title}]` : title }
                    </span>
                </div>


                <div className="item right" onClick={::this.switchInfoEditable}>

                    {
                        this.state.nameEditable
                            ? (
                                <div>
                                    <svg className="icon" aria-hidden="true">
                                        <use xlinkHref="#icon-people"></use>
                                    </svg>
                                    <input
                                        value={this.state.nameValue}
                                        onChange={
                                            (e) => {
                                                this.setState({
                                                    nameValue: e.target.value
                                                })
                                            }
                                        }
                                        onKeyDown={
                                            (e) => {
                                                if (e.keyCode === 13) {
                                                    this.setName();
                                                }
                                            }
                                        }
                                    />
                                    <span onClick={::this.setName}>
                                        <svg className="icon" aria-hidden="true">
                                            <use xlinkHref="#icon-roundcheck"></use>
                                        </svg>
                                    </span>
                                    <span onClick={
                                        () => {
                                            this.setState({
                                                nameEditable: false,
                                            });
                                        }
                                    }>
                                        <svg className="icon" aria-hidden="true">
                                            <use xlinkHref="#icon-roundclose"></use>
                                        </svg>
                                    </span>
                                </div>
                            )
                            : (
                                <div title="点击修改昵称">
                                    <svg className="icon" aria-hidden="true">
                                        <use xlinkHref="#icon-people"></use>
                                    </svg>
                                    { user.info.name || user.id }
                                </div>
                            )

                    }


                </div>
                {
                    webSocketStatus
                        ? null
                        : (
                            <div
                                className={ `item wifi ${'alert-color'}` }
                                title={'网络出错'}
                            >
                                <svg className="icon" aria-hidden="true">
                                    <use xlinkHref="#icon-wifi"></use>
                                </svg>
                            </div>
                        )
                }

            </section>
        )
    }
    componentWillMount () {

    }
    switchInfoEditable () {
        if (!this.state.nameEditable) {
            this.setState({
                nameEditable: true,
                nameValue: this.props.user.info.name || this.props.user.id,
            });
        }
    }
    setName () {
        wsAction.setUserInfo({
            name: this.state.nameValue,
        });
        this.setState({
            nameEditable: false,
        });
    }
}