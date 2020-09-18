import * as React from 'react'
import { Modal, Button } from 'react-bootstrap'
// import "bootstrap/dist/css/bootstrap.min.css";
import './ui-modal.scss'

export type RuleModalProp = {
    ruleName: string
    rules: React.ReactElement
}

export default function RuleModal(p: RuleModalProp) {
    const [show, setShow] = React.useState(false);
  
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);
    return <>
        <i className='fa fa-book icon' onClick={handleShow}/>

        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>{p.ruleName}</Modal.Title>
            </Modal.Header>
            <Modal.Body>{p.rules}</Modal.Body>
        </Modal>
    </>
}