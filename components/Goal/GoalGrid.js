import React, { Component } from 'react'
import Link from 'next/link'
import Lightbox from 'react-image-lightbox'

const images = [
  '../images/gallery/gallery1.jpg',
  '../images/gallery/gallery2.jpg',
  '../images/gallery/gallery3.jpg',
  '../images/gallery/gallery4.jpg',
  '../images/gallery/gallery5.jpg',
  '../images/gallery/gallery6.jpg',
  '../images/gallery/gallery7.jpg',
  '../images/gallery/gallery8.jpg',
  '../images/gallery/gallery9.jpg',
  '../images/gallery/gallery10.jpg',
  '../images/gallery/gallery11.jpg',
  '../images/gallery/gallery12.jpg',
]

class GoalGrid extends Component {
  state = {
    photoIndex: 0,
    isOpenImage: false,
  }
  render() {
    return (
      <section className='gallery-area ptb-100'>
        <div className='container'>
          <div className='row'>
            {[0, 0, 0, 0].map((i) => (
              <div className='col-lg-6 col-md-6'>Hello world!</div>
            ))}
          </div>
        </div>
      </section>
    )
  }
}

export default GoalGrid
