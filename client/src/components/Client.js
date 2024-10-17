import React from 'react'
import Avatar from 'react-avatar'

function Client({username}) {
  return (
    <div className="d-flex align-items-center mb-3">
    <Avatar name={username} size={50} round="14px" className="mr-3" />
    <div>
        <span className='mx-2'>{username}</span>
    </div>
</div>
  )
}

export default Client
