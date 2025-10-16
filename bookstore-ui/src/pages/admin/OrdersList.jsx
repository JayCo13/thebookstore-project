import React, { useMemo, useState } from 'react';
import { Button, Input } from '../../components';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import './OrdersList.css';

const ordersMock = [
  {
    id: '6709',
    date: '08/11/2021',
    customer: 'Olivia Cooper',
    channel: 'Amazon',
    destination: 'International',
    itemsCount: 3,
    status: 'Pending',
    items: [
      { name: 'Della Gao Laptop Backpack 15.6 Inch', code: 'PN-756760', pick: 1, bin: 'C011-034', vendor: 'LEVENTA', onHand: 53, image: '/assets/logo.png' },
      { name: 'Emsa Travel Mug Light Thermo', code: 'AS-765776', pick: 1, bin: 'C003-017', vendor: 'RUDIP', onHand: 210, image: '/assets/yoga_voighe.png' },
      { name: 'Doquas Bluetooth Over Ear Headphones', code: 'DC-787588', pick: 2, bin: 'C026-005', vendor: 'MIOIO', onHand: 19, image: '/assets/logi.jpg' },
    ],
  },
  {
    id: '6708', date: '08/11/2021', customer: 'Kevin Parsons', channel: 'Etsy', destination: 'Domestic', itemsCount: 5, status: 'Fulfilled', items: []
  },
  { id: '6707', date: '08/11/2021', customer: 'Frank Reid', channel: 'Amazon', destination: 'International', itemsCount: 1, status: 'Pending', items: [] },
  { id: '6706', date: '08/11/2021', customer: 'Stephanie Berry', channel: 'Lazada', destination: 'International', itemsCount: 2, status: 'Unfulfilled', items: [] },
  { id: '6705', date: '08/11/2021', customer: 'Sophie Miller', channel: 'Lazada', destination: 'Domestic', itemsCount: 7, status: 'Fulfilled', items: [] },
  { id: '6704', date: '08/11/2021', customer: 'Joan Ross', channel: 'Amazon', destination: 'International', itemsCount: 4, status: 'Fulfilled', items: [] },
];

const statusClass = (s) => ({
  Pending: 'status pending',
  Fulfilled: 'status fulfilled',
  Unfulfilled: 'status unfulfilled',
}[s] || 'status');

const channelBadge = (c) => {
  const map = {
    Amazon: { letter: 'a', color: '#111827' },
    Etsy: { letter: 'e', color: '#F97316' },
    Lazada: { letter: 'l', color: '#22C55E' },
  };
  const { letter, color } = map[c] || { letter: c?.[0] || '?', color: '#6B7280' };
  return <span className="channel" style={{ backgroundColor: color }}>{letter}</span>;
};

const OrdersList = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState([]); // list of expanded order ids
  const [dateFilter, setDateFilter] = useState('Any Date');
  const [channelFilter, setChannelFilter] = useState('All Channels');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ordersMock.filter(o => {
      const matchQuery = q === '' || o.id.includes(q) || o.customer.toLowerCase().includes(q);
      const matchChannel = channelFilter === 'All Channels' || o.channel === channelFilter;
      const matchStatus = statusFilter === 'All Status' || o.status === statusFilter;
      const matchDate = dateFilter === 'Any Date' || o.date === dateFilter;
      return matchQuery && matchChannel && matchStatus && matchDate;
    });
  }, [query, channelFilter, statusFilter, dateFilter]);

  const toggleExpand = (id) => {
    setExpanded((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="orders-page">
      <h1 className="page-title">Orders</h1>

      {/* Top bar */}
      <div className="orders-toolbar">
        <Input className="search" placeholder="Search Order ID" value={query} onChange={(e)=>setQuery(e.target.value)} />
        <div className="actions">
          <Button variant="outline">Export to Excel</Button>
          <Button variant="outline">Import Orders</Button>
          <Button variant="primary">+ New Order</Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="filters-row">
        <select value={dateFilter} onChange={(e)=>setDateFilter(e.target.value)}>
          <option>Any Date</option>
          {/* Demo values from mock data */}
          <option>08/11/2021</option>
        </select>
        <select value={channelFilter} onChange={(e)=>setChannelFilter(e.target.value)}>
          <option>All Channels</option>
          <option>Amazon</option>
          <option>Etsy</option>
          <option>Lazada</option>
        </select>
        <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
          <option>All Status</option>
          <option>Pending</option>
          <option>Fulfilled</option>
          <option>Unfulfilled</option>
        </select>
        <Button variant="outline">More Filters</Button>
      </div>

      {/* Table */}
      <div className="orders-table">
        <div className="orders-header">
          <div className="col col-check"></div>
          <div className="col col-id">Order ID</div>
          <div className="col col-date">Date</div>
          <div className="col col-customer">Customer</div>
          <div className="col col-channel">Sales Channel</div>
          <div className="col col-destination">Destination</div>
          <div className="col col-items">Items</div>
          <div className="col col-status">Status</div>
          <div className="col col-expand"></div>
        </div>

        {filtered.map(order => {
          const isOpen = expanded.includes(order.id);
          return (
            <div key={order.id} className="order-block">
              <div className="order-row">
                <div className="col col-check"><input type="checkbox" /></div>
                <div className="col col-id">
                  <button className="link" onClick={()=>navigate(`/admin/orders/${order.id}`)}>#{order.id}</button>
                </div>
                <div className="col col-date">{order.date}</div>
                <div className="col col-customer">{order.customer}</div>
                <div className="col col-channel">{channelBadge(order.channel)}</div>
                <div className="col col-destination">{order.destination}</div>
                <div className="col col-items">{order.itemsCount}</div>
                <div className="col col-status"><span className={statusClass(order.status)}>{order.status}</span></div>
                <div className="col col-expand">
                  <button className="icon" onClick={()=>toggleExpand(order.id)} aria-label="expand">
                    {isOpen ? <ChevronUpIcon className="h-5 w-5"/> : <ChevronDownIcon className="h-5 w-5"/>}
                  </button>
                </div>
              </div>

              {isOpen && order.items && order.items.length > 0 && (
                <div className="items-panel">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="item-row">
                      <img src={item.image} alt="" className="thumb" />
                      <div className="item-main">
                        <div className="name">{item.name}</div>
                        <div className="code">{item.code}</div>
                      </div>
                      <div className="item-meta">
                        <div className="cell"><span className="label">Pick</span> <span className="value">{item.pick}</span></div>
                        <div className="cell"><span className="label">Bin</span> <span className="value">{item.bin}</span></div>
                        <div className="cell"><span className="label">Vendor</span> <span className="value">{item.vendor}</span></div>
                        <div className="cell"><span className="label">On Hand</span> <span className="value">{item.onHand}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersList;