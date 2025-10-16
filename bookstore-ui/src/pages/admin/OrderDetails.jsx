import React from 'react';
import { Button } from '../../components';
import './OrderDetails.css';

const OrderDetails = () => {
  const orderId = window.location.pathname.split('/').pop();
  return (
    <div className="order-details">
      <header className="od-header">
        <h1>Order #{orderId}</h1>
        <div className="tags">
          <span className="tag paid">Paid</span>
          <span className="tag unfulfilled">Unfulfilled</span>
        </div>
        <div className="meta">06.22.2019 at 10:14 am</div>
        <div className="head-actions">
          <Button variant="primary">Fulfill</Button>
        </div>
      </header>

      <div className="od-grid">
        {/* Left column */}
        <div className="left">
          <section className="card">
            <div className="card-header">
              <span className="dot yellow"></span>
              <span className="title">Unfulfilled</span>
              <span className="count">2</span>
            </div>
            <div className="item">
              <div className="item-main">
                <div className="name">Nike Air Force 1 LV8 2</div>
                <div className="attrs">Color: Black-Pink • Shoelaces: Black • Size: US 10</div>
              </div>
              <div className="price">
                <span className="sale">$80.00</span>
                <span className="strike">$138.00</span>
              </div>
              <div className="qty">1</div>
              <div className="line">$80.00</div>
            </div>
            <div className="item">
              <div className="item-main">
                <div className="name">UNITED STANDARD - Long Hoodie</div>
                <div className="attrs">Color: Black • Size: US 10</div>
              </div>
              <div className="price">$234.00</div>
              <div className="qty">1</div>
              <div className="line">$234.00</div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">Delivery</div>
            <div className="delivery-row">
              <div className="carrier">FedEx</div>
              <div className="desc">First class package</div>
            </div>
            <div className="fee">$20.00</div>
          </section>

          <section className="card">
            <div className="card-header">Payment Summary</div>
            <div className="summary-row">
              <span>Subtotal (2 items)</span>
              <span>$314.00</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>$20.00</span>
            </div>
            <div className="summary-row">
              <span>Tax (VAT 20% included)</span>
              <span>$0.00</span>
            </div>
            <div className="summary-total">
              <span>Total paid by customer</span>
              <span>$334.00</span>
            </div>
          </section>
        </div>

        {/* Right column */}
        <aside className="right">
          <section className="card">
            <div className="card-header">Customer</div>
            <div className="customer">
              <div className="avatar"></div>
              <div className="info">
                <div className="name">Eugenia Bates</div>
                <div className="orders">5 Orders</div>
                <div className="contact">eugenia.bates@gmail.com • +1 (223) 123-1234</div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">Shipping Address</div>
            <div className="address">
              Eugenia Bates
              <br/>Sawayn Oval, 605, New York, 12101
              <br/>United States
            </div>
          </section>

          <section className="card">
            <div className="card-header">Billing Address</div>
            <div className="address">
              Eugenia Bates
              <br/>Sawayn Oval, 605, New York, 12101
              <br/>United States
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetails;