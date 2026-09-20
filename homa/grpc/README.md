# Homa gRPC Client Server Example

Here we explore a simple gRPC client/server example that sits atop a Homa transport.

Homa is particularly suited for gRPC communication since it deals natively with "messages", not just
a byte stream as does TCP.  gRPC also communicates in packetized messages, so can take advantage of
Homa's ability to prioritize communications for low-latency based upon this distinction.

## Minimal C++ gRPC over Homa Example

To use gRPC with Homa, you will use Stanford's modified 
[grpc_homa](https://github.com/PlatformLab/grpc_homa) library inside your VM sandbox.

The key difference from standard gRPC is changing `grpc::InsecureChannelCredentials()` to
`HomaClient::insecureChannelCredentials()`.

### Protocol Buffers Schema (`ping.proto`)

```protobuf
syntax = "proto3";

package homademo;

service PingService {
  rpc SendPing (PingRequest) returns (PingResponse);
}

message PingRequest {
  string message = 1;
}

message PingResponse {
  string message = 1;
}
```

Compile these with:

```shell
$ # 1. Generate core types
$ protoc --cpp_out=. homa_server.proto
$ # 2. Generate gRPC service stubs (creates homa_server.grpc.pb.h and homa_server.grpc.pb.cc)
$ protoc --grpc_out=. --plugin=protoc-gen-grpc=`which grpc_cpp_plugin` homa_server.proto
```

### The C++ gRPC-Homa Server (`server.cc`)

```cpp
#include <iostream>
#include <memory>
#include <string>

#include <grpcpp/grpcpp.h>
#include "ping.grpc.pb.h"
#include "homa_server.h" // From the grpc_homa repository

class PingServiceImpl final : public homademo::PingService::Service {
    grpc::Status SendPing(grpc::ServerContext* context, 
                          const homademo::PingRequest* request, 
                          homademo::PingResponse* reply) override {
        std::cout << "Received gRPC Request via Homa: " << request->message() << std::endl;
        reply->set_message("Hello from Homa gRPC Server!");
        return grpc::Status::OK;
    }
};

int main() {
    std::string server_address("0.0.0.0:50051");
    PingServiceImpl service;

    grpc::ServerBuilder builder;
    // CRITICAL: Bind using Homa server credentials instead of standard TCP
    builder.AddListeningPort(server_address, HomaServer::insecureServerCredentials());
    builder.RegisterService(&service);
    
    std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
    std::cout << "gRPC Homa Server listening on " << server_address << std::endl;
    server->Wait();
    return 0;
}
```

### The C++ gRPC-Homa Client (`client.cc`)

```cpp
#include <iostream>
#include <memory>
#include <string>

#include <grpcpp/grpcpp.h>
#include "ping.grpc.pb.h"
#include "homa_client.h" // From the grpc_homa repository

int main() {
    // CRITICAL: Instantiate the channel using Homa client credentials
    auto channel = grpc::CreateChannel("127.0.0.1:50051", HomaClient::insecureChannelCredentials());
    auto stub = homademo::PingService::NewStub(channel);

    homademo::PingRequest request;
    request.set_message("Hello Server, I am using gRPC over Homa!");

    homademo::PingResponse reply;
    grpc::ClientContext context;

    grpc::Status status = stub->SendPing(&context, request, &reply);

    if (status.ok()) {
        std::cout << "gRPC Success! Response: " << reply.message() << std::endl;
    } else {
        std::cout << "gRPC Failed: " << status.error_message() << std::endl;
    }
    return 0;
}
```
