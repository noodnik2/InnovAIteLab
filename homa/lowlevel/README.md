# Low Level Client / Server Communication Example Atop of Homa

This folder explores a low-level client / server communication atop of Homa instead of TCP.

## Minimal Go and Homa Starter (No gRPC)

To explore Homa in Go on your Mac, we can code directly against a raw Homa socket.  Because Homa is explicitly
designed for remote procedure calls (RPCs), its socket API operates exactly like a lightweight RPC framework.

Here we implement a minimal Go client and server that speaks native Homa using standard Linux system calls. 
Save these inside your Multipass VM.

### The Homa Go Server (server.go)
Instead of listening for a streaming TCP connection, a Homa server opens a packet socket and waits for
a distinct incoming RPC request message.

```go
package main

import (
	"fmt"
	"log"
	"syscall"
)

const (
    AF_INET      = 2
    SOCK_RAW   = 3
	IPPROTO_HOMA = 146 // assigned protocol number for Homa in the Linux kernel module
	HOMA_PORT    = 50051
)

func main() {
	// 1. Create the socket using the Homa Address Family
	fd, err := syscall.Socket(AF_INET, SOCK_RAW, IPPROTO_HOMA)
	if err != nil {
		log.Fatalf("Failed to create Homa socket: %v", err)
	}
	defer syscall.Close(fd)

	// 2. Bind the socket
	addr := &syscall.SockaddrInet4{Port: HOMA_PORT}
	if err := syscall.Bind(fd, addr); err != nil {
		log.Fatalf("Failed to bind port %d: %v", err, HOMA_PORT)
	}
	fmt.Printf("Homa RPC Server listening on port %d...\n", HOMA_PORT)

	buffer := make([]byte, 4096)

	for {
		// 3. Receive an RPC request packet message via system call
		// Note: Production environments use PlatformLab's specialized 'homa_recvmsg' args 
		n, from, err := syscall.Recvfrom(fd, buffer, 0)
		if err != nil {
			log.Printf("Error receiving RPC: %v", err)
			continue
		}

		requestMsg := string(buffer[:n])
		fmt.Printf("Received RPC Request: %s\n", requestMsg)

		// 4. Send back a response directly to the client
		responseMsg := []byte("Hello from Go Homa Server!")
		err = syscall.Sendto(fd, responseMsg, 0, from)
		if err != nil {
			log.Printf("Failed to reply to client: %v", err)
		}
	}
}
```

### The Homa Go Client (client.go)

Unlike TCP clients, Homa clients do not dial or establish a handshake (Connect). They simply fire an autonomous
request message directly at the server's target address and block until a reply arrives.


```go
package main

import (
	"fmt"
	"log"
	"syscall"
)

const (
    AF_INET      = 2
    SOCK_RAW     = 3
	IPPROTO_HOMA = 146
	SERVER_PORT  = 50051
)

func main() {
	// 1. Open the Homa socket
	fd, err := syscall.Socket(AF_INET, SOCK_RAW, IPPROTO_HOMA)
	if err != nil {
		log.Fatalf("Failed to create Homa socket: %v", err)
	}
	defer syscall.Close(fd)

	// 2. Define the server destination (localhost inside the VM)
	serverAddr := &syscall.SockaddrInet4{
		Port: SERVER_PORT,
		Addr: [4]byte{127, 0, 0, 1},
	}

	// 3. Dispatch the payload message
	msg := []byte("Hello Server, I am speaking Homa!")
	err = syscall.Sendto(fd, msg, 0, serverAddr)
	if err != nil {
		log.Fatalf("Failed to send Homa packet: %v", err)
	}
	fmt.Println("Homa RPC sent successfully.")

	// 4. Await the response packet
	replyBuf := make([]byte, 4096)
	n, _, err := syscall.Recvfrom(fd, replyBuf, 0)
	if err != nil {
		log.Fatalf("Failed to receive Homa response: %v", err)
	}

	fmt.Printf("Server Response: %s\n", string(replyBuf[:n]))
}
```

### Running inside your VM Sandbox

To execute this inside the setup created previously:

Inside your homa-sandbox VM, install Go:

```shell
$ sudo apt install golang-go
```

Save the files as `server.go` and `client.go`.

Ensure the Homa kernel module is loaded; e.g.:

```shell
$ sudo insmod HomaModule/homa.ko
```

Run the server in the background: 

```shell
$ go run server.go &
```

Trigger the client:

```shell
$ go run client.go
```
