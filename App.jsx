import { useState, useEffect, useRef } from 'react';
import './index.css';

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' or 'grocery'

  // --- Subscription State ---
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [gst, setGst] = useState('0');
  const [category, setCategory] = useState('Subscription');
  const [billingCycle, setBillingCycle] = useState('Monthly');
  const [subCurrency, setSubCurrency] = useState('INR');
  const [timeFrame, setTimeFrame] = useState('Monthly');
  const [exchangeRates, setExchangeRates] = useState({ USD: 0.012, EUR: 0.011, JPY: 1.81, INR: 1.0 });
  
  // --- Chat State ---
  const [messages, setMessages] = useState([{ role: 'ai', content: 'Hi! Ask me to help you analyze your subscriptions and expenses.' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // --- Grocery State ---
  const [searchItem, setSearchItem] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [discounts, setDiscounts] = useState([]);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);

  // --- True Cost State ---
  const [tcItemPrice, setTcItemPrice] = useState('');
  const [tcWage, setTcWage] = useState('');
  const [tcWageType, setTcWageType] = useState('Hourly');
  const [tcExpectedUses, setTcExpectedUses] = useState('');
  const [tcReturnRate, setTcReturnRate] = useState('7');
  const [tcYears, setTcYears] = useState('10');

  // --- Product Value State ---
  const [pvProductName, setPvProductName] = useState('');
  const [pvIngredients, setPvIngredients] = useState('');
  const [pvBaseCost, setPvBaseCost] = useState('');
  const [pvGst, setPvGst] = useState('0');
  const [pvShipping, setPvShipping] = useState('0');
  const [pvQuantity, setPvQuantity] = useState('');
  const [pvUnit, setPvUnit] = useState('g');
  const [pvAnalysis, setPvAnalysis] = useState('');
  const [pvLoading, setPvLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchExpenses();
      fetchRates();
    }
  }, [activeTab]);

  const fetchRates = async () => {
    try {
      const res = await fetch("https://api.frankfurter.app/latest?from=INR&to=USD,EUR,JPY");
      if (res.ok) {
        const data = await res.json();
        setExchangeRates({
          INR: 1.0,
          USD: data.rates.USD || 0.012,
          EUR: data.rates.EUR || 0.011,
          JPY: data.rates.JPY || 1.81
        });
      }
    } catch (err) {
      console.error("Failed to fetch rates", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Handlers for Subscriptions ---
  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/expenses`);
      const data = await res.json();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!name || !cost) return;

    try {
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          cost: parseFloat(cost),
          gst_percentage: parseFloat(gst),
          category,
          billing_cycle: billingCycle
        })
      });
      const newExp = await res.json();
      setExpenses([...expenses, newExp]);
      setName('');
      setCost('');
      setGst('0');
      setBillingCycle('Monthly');
    } catch (err) {
      console.error('Failed to add expense', err);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/expenses/${id}`, { method: 'DELETE' });
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', content: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: `Error: ${data.detail || 'Something went wrong'}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Network Error: Failed to contact AI agent.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Handlers for Grocery ---
  const handleSearchGrocery = async (e) => {
    e.preventDefault();
    if (!searchItem.trim()) return;
    setGroceryLoading(true);
    setDiscounts([]);
    setSearchAttempted(false);
    
    try {
      const res = await fetch(`${API_BASE_URL}/grocery/discounts?item=${encodeURIComponent(searchItem)}&currency=${currency}`);
      const data = await res.json();
      // Sort by price ascending
      data.sort((a, b) => a.discounted_price - b.discounted_price);
      setDiscounts(data);
    } catch (err) {
      console.error("Failed to fetch discounts", err);
    } finally {
      setGroceryLoading(false);
      setSearchAttempted(true);
    }
  };

  const handleAnalyzeIngredients = async () => {
    if (!pvProductName || !pvIngredients || !pvBaseCost || !pvQuantity) {
      setPvAnalysis("⚠️ Please fill out the Product Name, Ingredients, Base Cost, and Net Quantity fields so the AI has all the numbers it needs!");
      return;
    }
    setPvLoading(true);
    setPvAnalysis('');
    try {
      const payload = {
        product_name: pvProductName,
        ingredients: pvIngredients,
        base_cost: parseFloat(pvBaseCost) || 0,
        gst: parseFloat(pvGst) || 0,
        shipping: parseFloat(pvShipping) || 0,
        quantity: parseFloat(pvQuantity) || 1,
        unit: pvUnit
      };
      const res = await fetch(`${API_BASE_URL}/analyze-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setPvAnalysis(data.analysis);
      } else {
        setPvAnalysis("Error analyzing product.");
      }
    } catch (err) {
      setPvAnalysis("Network error.");
    } finally {
      setPvLoading(false);
    }
  };

  // Calculations
  const rate = exchangeRates[subCurrency] || 1.0;
  const currencySymbols = { INR: '₹', USD: '$', EUR: '€', JPY: '¥' };
  const sym = currencySymbols[subCurrency] || '$';

  const getMultiplier = (fromCycle, toFrame) => {
    // Normalize everything to a Monthly base
    const toMonthly = {
      Daily: 30,
      Weekly: 52 / 12,
      Monthly: 1,
      Yearly: 1 / 12
    };
    
    const fromMonthlyToTarget = {
      Daily: 1 / 30,
      Weekly: 12 / 52,
      Monthly: 1,
      Yearly: 12
    };
    
    const baseCycle = fromCycle || 'Monthly';
    return toMonthly[baseCycle] * fromMonthlyToTarget[toFrame];
  };

  const baseTotalCost = expenses.reduce((sum, exp) => sum + (exp.cost * getMultiplier(exp.billing_cycle, timeFrame)), 0);
  const baseTotalGst = expenses.reduce((sum, exp) => sum + (exp.cost * (exp.gst_percentage / 100) * getMultiplier(exp.billing_cycle, timeFrame)), 0);
  
  const displayTotalCost = baseTotalCost * rate;
  const displayTotalGst = baseTotalGst * rate;
  const displayTotal = displayTotalCost + displayTotalGst;

  return (
    <>
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          Subscriptions & Finance
        </button>
        <button 
          className={`nav-tab ${activeTab === 'grocery' ? 'active' : ''}`}
          onClick={() => setActiveTab('grocery')}
        >
          Grocery Discounts
        </button>
        <button 
          className={`nav-tab ${activeTab === 'truecost' ? 'active' : ''}`}
          onClick={() => setActiveTab('truecost')}
        >
          True Cost Calculator
        </button>
        <button 
          className={`nav-tab ${activeTab === 'productvalue' ? 'active' : ''}`}
          onClick={() => setActiveTab('productvalue')}
        >
          Product Value Analyzer
        </button>
      </div>

      <h1>{activeTab === 'subscriptions' ? 'AI Financial Manager' : activeTab === 'grocery' ? 'Smart Grocery Finder' : activeTab === 'truecost' ? 'True Cost Calculator' : 'Product Value Analyzer'}</h1>

      <div className="container">
        
        {/* LEFT COLUMN */}
        <div className="main-content">
          
          {activeTab === 'subscriptions' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Dashboard</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    value={timeFrame} 
                    onChange={e => setTimeFrame(e.target.value)}
                    style={{ padding: '0.4rem', borderRadius: '4px' }}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                  <select 
                    value={subCurrency} 
                    onChange={e => setSubCurrency(e.target.value)}
                    style={{ width: '120px', padding: '0.4rem', borderRadius: '4px' }}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div className="glass-panel summary-grid">
                <div className="summary-card">
                  <p>{timeFrame} Cost</p>
                  <h3>{sym}{displayTotalCost.toFixed(2)}</h3>
                </div>
                <div className="summary-card">
                  <p>{timeFrame} GST</p>
                  <h3>{sym}{displayTotalGst.toFixed(2)}</h3>
                </div>
                <div className="summary-card">
                  <p>{timeFrame} Total</p>
                  <h3>{sym}{displayTotal.toFixed(2)}</h3>
                </div>
              </div>

              <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <h2>Add Expense</h2>
                <form onSubmit={handleAddExpense}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>Name</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Netflix, Rent, AWS" required />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select value={category} onChange={e => setCategory(e.target.value)}>
                        <option>Subscription</option>
                        <option>Rent</option>
                        <option>Utility</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Billing Cycle</label>
                      <select value={billingCycle} onChange={e => setBillingCycle(e.target.value)}>
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                        <option>Yearly</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Cost (Base INR)</label>
                      <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" required />
                    </div>
                    <div className="form-group">
                      <label>GST (%)</label>
                      <input type="number" step="0.1" value={gst} onChange={e => setGst(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <button type="submit" style={{ marginTop: '1rem' }}>Add Expense</button>
                </form>
              </div>

              <div className="glass-panel">
                <h2>Your Expenses</h2>
                {loading ? <p>Loading...</p> : expenses.length === 0 ? <p>No expenses added yet.</p> : (
                  <ul className="expense-list">
                    {expenses.map(exp => (
                      <li key={exp.id} className="expense-item">
                        <div className="expense-info">
                          <h4>{exp.name}</h4>
                          <p>{exp.category} • {exp.billing_cycle || 'Monthly'} • {exp.gst_percentage}% GST</p>
                        </div>
                        <div className="expense-actions">
                          <span className="expense-cost">{sym}{((exp.cost + (exp.cost * exp.gst_percentage / 100)) * rate * getMultiplier(exp.billing_cycle, timeFrame)).toFixed(2)}</span>
                          <button className="danger" onClick={() => handleDeleteExpense(exp.id)} style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.8rem' }}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {activeTab === 'grocery' && (
            <div className="glass-panel">
              <h2>Find Best Grocery Deals</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Search for an item to compare prices and discounts across Swiggy Instamart, Zepto, Blinkit, Amazon Fresh, and JioMart!
              </p>
              
              <form onSubmit={handleSearchGrocery} style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  value={searchItem} 
                  onChange={e => setSearchItem(e.target.value)} 
                  placeholder="e.g. Milk, Bread, Eggs..." 
                  style={{ flex: 1 }}
                  required
                />
                <select 
                  value={currency} 
                  onChange={e => setCurrency(e.target.value)}
                  style={{ width: '100px' }}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
                <button type="submit" disabled={groceryLoading} style={{ width: 'auto' }}>
                  {groceryLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {!groceryLoading && searchAttempted && discounts.length === 0 && (
                <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff5f5', color: '#e03131', borderRadius: '8px', border: '1px solid #ffa8a8' }}>
                  <strong>No Data Found.</strong> 
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>The API hit a rate limit or DuckDuckGo blocked the search. Try again later when your quota resets!</p>
                </div>
              )}

              {discounts.length > 0 && (
                <div className="discount-grid">
                  {discounts.map((deal, index) => (
                    <div key={index} className="glass-panel discount-card">
                      {index === 0 && <div className="best-deal-badge">Best Deal</div>}
                      
                      <div className="discount-header">
                        <div className="platform-dot" style={{ backgroundColor: deal.badge_color }}></div>
                        <span className="platform-name">{deal.platform}</span>
                      </div>
                      
                      <h3 style={{ margin: '0.5rem 0' }}>{deal.item_name}</h3>
                      
                      <div className="discount-prices">
                        <div className="original-price">{deal.currency_symbol}{deal.original_price.toFixed(2)}</div>
                        <div className="discounted-price">
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                              {deal.currency_symbol}{deal.discounted_price.toFixed(2)}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#ff6b6b', background: '#ffe3e3', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                              {deal.discount_percentage}% OFF
                            </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'truecost' && (
            <div className="glass-panel">
              <h2>"True Cost" Shopping Calculator</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Enter an item's price and your personal numbers to expose the hidden financial impact of that purchase instantly.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label>Item Price ({sym})</label>
                  <input type="number" value={tcItemPrice} onChange={e => setTcItemPrice(e.target.value)} placeholder="e.g. 100" />
                </div>
                <div className="form-group">
                  <label>Expected Number of Uses</label>
                  <input type="number" value={tcExpectedUses} onChange={e => setTcExpectedUses(e.target.value)} placeholder="e.g. 5" />
                </div>
                <div className="form-group">
                  <label>Your Wage</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" value={tcWage} onChange={e => setTcWage(e.target.value)} placeholder="e.g. 20" style={{ flex: 1 }} />
                    <select value={tcWageType} onChange={e => setTcWageType(e.target.value)} style={{ width: '120px' }}>
                      <option value="Hourly">Hourly</option>
                      <option value="Daily">Daily</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Investment Details</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" value={tcReturnRate} onChange={e => setTcReturnRate(e.target.value)} placeholder="% Return" style={{ width: '50%' }} title="Annual Return Rate (%)" />
                    <input type="number" value={tcYears} onChange={e => setTcYears(e.target.value)} placeholder="Years" style={{ width: '50%' }} title="Number of Years" />
                  </div>
                  <small style={{ color: 'var(--text-secondary)' }}>Return Rate (%) & Years</small>
                </div>
              </div>

              {tcItemPrice && (
                <div className="summary-grid" style={{ gap: '1rem' }}>
                  <div className="summary-card" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                    <p style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>The Work-Time Cost</p>
                    {tcWage && tcWage > 0 ? (() => {
                       let hourlyWage = parseFloat(tcWage);
                       if (tcWageType === 'Daily') hourlyWage = hourlyWage / 8; // Assuming 8-hour workday
                       if (tcWageType === 'Monthly') hourlyWage = hourlyWage / 160; // Assuming 160 working hours a month
                       const hours = (parseFloat(tcItemPrice) / hourlyWage).toFixed(1);
                       return <h3 style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>Costs {hours} hours of your life.</h3>;
                    })() : <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Enter wage to calculate.</p>}
                  </div>

                  <div className="summary-card" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                    <p style={{ fontWeight: 'bold', color: '#10b981' }}>The Investment Loss</p>
                    {tcReturnRate && tcYears ? (() => {
                       const P = parseFloat(tcItemPrice);
                       const r = parseFloat(tcReturnRate) / 100;
                       const t = parseFloat(tcYears);
                       const futureValue = P * Math.pow(1 + r, t);
                       return <h3 style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>Would be {sym}{futureValue.toFixed(2)} in {tcYears} years.</h3>;
                    })() : null}
                  </div>

                  <div className="summary-card" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                    <p style={{ fontWeight: 'bold', color: '#f59e0b' }}>The Cost-Per-Use</p>
                    {tcExpectedUses && tcExpectedUses > 0 ? (() => {
                       const costPerUse = parseFloat(tcItemPrice) / parseFloat(tcExpectedUses);
                       return <h3 style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>{sym}{costPerUse.toFixed(2)} per use.</h3>;
                    })() : <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Enter expected uses to calculate.</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'productvalue' && (
            <div className="glass-panel">
              <h2>Product Value & Health Analyzer</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Find the true landed cost of a product and analyze its ingredients for healthiness!
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Product Name</label>
                  <input type="text" value={pvProductName} onChange={e => setPvProductName(e.target.value)} placeholder="e.g. Organic Peanut Butter, or iPhone 15" />
                </div>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Ingredients / Materials</label>
                  <textarea 
                    value={pvIngredients} 
                    onChange={e => setPvIngredients(e.target.value)} 
                    placeholder="e.g. Peanuts, Sugar, Salt..." 
                    rows="3"
                    style={{ resize: 'vertical' }}
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Base Cost ({sym})</label>
                  <input type="number" value={pvBaseCost} onChange={e => setPvBaseCost(e.target.value)} placeholder="e.g. 250" />
                </div>
                
                <div className="form-group">
                  <label>Net Quantity</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" value={pvQuantity} onChange={e => setPvQuantity(e.target.value)} placeholder="e.g. 500" style={{ flex: 1 }} />
                    <select value={pvUnit} onChange={e => setPvUnit(e.target.value)} style={{ width: '80px' }}>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>GST Tax (%)</label>
                  <input type="number" value={pvGst} onChange={e => setPvGst(e.target.value)} placeholder="e.g. 5" />
                </div>

                <div className="form-group">
                  <label>Shipping / Extra Fees ({sym})</label>
                  <input type="number" value={pvShipping} onChange={e => setPvShipping(e.target.value)} placeholder="e.g. 40" />
                </div>
              </div>

              <button 
                onClick={handleAnalyzeIngredients} 
                disabled={pvLoading}
                style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', marginTop: '1rem', cursor: pvLoading ? 'not-allowed' : 'pointer' }}
              >
                {pvLoading ? 'AI is Calculating & Analyzing...' : 'Analyze Full Product Value & Health ✨'}
              </button>
              
              {pvAnalysis && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '1.05rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  <strong style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem', display: 'block', marginBottom: '1rem' }}>🤖 AI Full Analysis:</strong>
                  {pvAnalysis}
                </div>
              )}

            </div>
          )}


        </div>

        {/* RIGHT COLUMN: AI Agent */}
        <div className="sidebar">
          <div className="glass-panel chat-container">
            <h2>AI Assistant</h2>
            
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role}`}>
                  {msg.content}
                </div>
              ))}
              {chatLoading && <div className="chat-message ai">Thinking...</div>}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input" onSubmit={handleChatSubmit}>
              <input 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                placeholder="Ask about your expenses..." 
                disabled={chatLoading}
              />
              <button type="submit" disabled={chatLoading}>Send</button>
            </form>
          </div>
        </div>

      </div>
    </>
  );
}

export default App;
