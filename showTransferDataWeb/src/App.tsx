import { useState, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import MyTokenABI from './contracts/MyToken.json'

type Transfer = {
  from: string
  to: string
  value: string
  timestamp: number
}

function App() {
  const account = useAccount()
  const { connectors, connect, status, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  })
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all')

  const { data: balance, refetch: refetchBalance } = useReadContract({
    abi: MyTokenABI,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    functionName: 'balanceOf',
    args: [account.address],
    query: {
      enabled: !!account.address,
      refetchInterval: 10000 // Refresh every 10 seconds
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)

  const fetchTransfers = async () => {
    setIsLoading(true)
    setFetchError('')
    try {
      const url = new URL(`http://localhost:3001/api/transfers/${account.address}`)
      url.searchParams.set('page', pagination.page.toString())
      url.searchParams.set('limit', pagination.limit.toString())
      if (filter !== 'all') {
        url.searchParams.set('type', filter)
      }
      
      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Network response was not ok')
      const data = await response.json()
      setTransfers(data.transfers || [])
      setPagination(data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
      })
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch transfers:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div>
        <h2>Account</h2>
        <div>
          status: {account.status}
          <br />
          address: {account.address}
          <br />
          chainId: {account.chainId}
          <br />
          Token Balance: {balance?.toString()}
        </div>

        {account.status === 'connected' && (
          <>
            <button type="button" onClick={() => disconnect()}>
              Disconnect
            </button>
            <button onClick={fetchTransfers}>Fetch Transfers</button>
            <div style={{marginTop: '10px'}}>
              <label>
                <input 
                  type="radio" 
                  name="filter" 
                  checked={filter === 'all'}
                  onChange={() => setFilter('all')}
                /> All
              </label>
              <label style={{marginLeft: '10px'}}>
                <input
                  type="radio"
                  name="filter"
                  checked={filter === 'in'}
                  onChange={() => setFilter('in')}
                /> Incoming
              </label>
              <label style={{marginLeft: '10px'}}>
                <input
                  type="radio"
                  name="filter"
                  checked={filter === 'out'}
                  onChange={() => setFilter('out')}
                /> Outgoing
              </label>
            </div>
          </>
        )}
      </div>

      <div>
        <h2>Connect</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
        <div>{status}</div>
        <div>{connectError?.message}</div>
      </div>

      {isLoading && <p>Loading transfers...</p>}
      {fetchError && <p style={{color: 'red'}}>Error: {fetchError}</p>}
      {transfers.length > 0 && (
        <>
        <div>
          <h3>Transfer History</h3>
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer, i) => (
                <tr key={i}>
                  <td>{transfer.from}</td>
                  <td>{transfer.to}</td>
                  <td>{transfer.value}</td>
                  <td 
                  style={{cursor: 'pointer', textDecoration: 'underline'}}
                  onClick={() => setSelectedTransfer(transfer)}
                >
                  {new Date(transfer.timestamp).toLocaleString()}
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop: '20px'}}>
          <button 
            disabled={pagination.page <= 1}
            onClick={() => setPagination(prev => ({...prev, page: prev.page - 1}))}
          >
            Previous
          </button>
          <span style={{margin: '0 10px'}}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination(prev => ({...prev, page: prev.page + 1}))}
          >
            Next
          </button>
        </div>
        </>
      )}

      {selectedTransfer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h3>Transfer Details</h3>
            <div style={{marginBottom: '10px'}}>
              <strong>From:</strong> {selectedTransfer.from}
            </div>
            <div style={{marginBottom: '10px'}}>
              <strong>To:</strong> {selectedTransfer.to}
            </div>
            <div style={{marginBottom: '10px'}}>
              <strong>Amount:</strong> {selectedTransfer.value}
            </div>
            <div style={{marginBottom: '10px'}}>
              <strong>Date:</strong> {new Date(selectedTransfer.timestamp * 1000).toLocaleString()}
            </div>
            <button 
              onClick={() => setSelectedTransfer(null)}
              style={{marginTop: '20px'}}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default App
