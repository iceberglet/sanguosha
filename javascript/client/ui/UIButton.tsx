import * as React from 'react'

type ButtonProp = {
    display: string
    disabled: boolean
    onClick: ()=>void
    className?: string
}

export default function UIButton(p: ButtonProp) {
    return <button className={'ui-button ' + p.className} disabled={p.disabled} onClick={()=>p.disabled || p.onClick()}>
        {p.display}
    </button>
}


type DropDownButtonProp = {
    display: string
    onClick: (choice: string)=>void
    className?: string
    list: string[]
}

export function UIDropDownButton(p: DropDownButtonProp) {

    let [disabled, setDisabled] = React.useState<boolean>(false)
    let [isExpand, setExpand] = React.useState<boolean>(false)

    const onChoose=(choice: string)=>{
        p.onClick(choice)
        setDisabled(true)
        setTimeout(()=>{
            setDisabled(false)
        }, 5000)
    }

    return <button className={'ui-button ' + p.className} disabled={disabled} onClick={()=>setExpand(!isExpand)} onBlur={()=>setExpand(false)}>
        {p.display}
        {isExpand && <div className='drop-down'>
            {p.list.map(item => {
                return <div className='choice' key={item} onClick={()=>onChoose(item)}>{item}</div>
            })}
        </div>}
    </button>

}