# Setup Homa Laboratory for Macos

As a counterpart to TCP, Homa will run within kernel space.  As of this writing, Homa is not built in to the
Macos kernel and since macOS uses a kernel that's inordinately challenging - and generally inappropriate - to
serve as an installation target for a Homa kernel module, a reasonable alternative is to use a Linux version
into which we can load a Homa kernel module.

Because the official
[PlatformLab/grpc_homa](https://github.com/PlatformLab/grpc_homa)
implementation relies on a Linux kernel module, you cannot use a standard Docker container on macOS to try it out.

Docker on Mac runs inside a lightweight, pre-packaged Linux Virtual Machine managed by Docker Desktop. We can't
dynamically load arbitrary custom kernel modules (like Homa) into Docker Desktop's hidden VM. To bypass this and
give us a low-touch, single-command environment directly on a Mac, a solution is to spin up an explicit Linux VM
using Vagrant or Multipass first, or use a Docker-in-Docker setup.

A "ready-made" approach for a Mac user is using [Multipass] (Ubuntu's official, hyper-fast VM manager for Mac) to
create a Linux node where we can then run Docker with full kernel privileges.  However, initial experience trying
to use Multipass has been frustrating, so alternatives have been explored.  The alternative which was successful uses
"Vagrant", as outlined below.  Other alternatives worth consideration include [Lima], [Colima], [UTM] and [OrbStack];
though, these have not been tried as of this writing.

## Step 1: Create a Homa-capable Linux Environment

### Using Confluent `multipass`

Open a Mac terminal and install Multipass using Apple's native Hypervisor framework to run a real Linux kernel:

```shell
# Install multipass via Homebrew
$ brew install multipass

# Launch an Ubuntu VM with enough resources to compile gRPC
$ multipass launch --name homa-sandbox --cpus 2 --memory 4G --disk 20G

# Shell into your new Linux environment
$ multipass shell homa-sandbox
```

### Vagrant / VirtualBox

If Multipass doesn't work, try Vagrant + VirtualBox:

```shell
$ brew install --cask virtualbox vagrant
$ mkdir homa-sandbox && cd homa-sandbox
$ vagrant init ubuntu/bionic64
$ vagrant up
$ vagrant ssh
```

## Step 2: Install Docker & Homa Module inside the VM

From inside the real Ubuntu VM, install Docker and the necessary kernel headers to load Homa:

```shell
$ # Update and install Docker + Kernel Build tools
$ sudo apt update && sudo apt install -y build-essential linux-headers-$(uname -r) git
$ # Clone and install the Homa Linux Kernel Module
$ git clone https://github.com/PlatformLab/HomaModule.git
$ cd HomaModule
$ # Check out the dedicated Linux version 4.15 compatibility branch
$ git checkout linux_4.15.18
$ make
$ # if error on `.early_demux`, comment out those assignments and run `make` again
$ sudo insmod homa.ko
$ # Verify Homa is loaded in the kernel
$ lsmod | grep homa
```

--- 

# NOTE - Below here is WIP; what's described below didn't work last tried 

## Step 3: Run the Ready-Made gRPC-Homa Example via Docker

Stanford's PlatformLab provides a modified version of gRPC v1.57.0 that natively handles Homa transport via
a single-line credential swap (`HomaClient::insecureChannelCredentials()`).

Still inside your Multipass VM, compile and run the official testing stack:

```shell
$ # Clone the gRPC Homa repository
$ git clone https://github.com/PlatformLab/grpc_homa.git
$ cd grpc_homa
$ # Load some needed libraries
$ sudo apt-get install -y libgrpc-dev libgrpc++-dev libprotobuf-dev protobuf-compiler-grpc
$ # Install docker if not already there
$ sudo apt install -y docker.io docker-compose 
$ # Build the bundled Docker environment containing the modified gRPC library
$ # Note: This will build the C++ environment which includes Homa-gRPC example binaries.
$ docker build -t grpc-homa-demo .
```

To run a client-server benchmark over the Homa transport layer, you can use Docker to spin up
both entities on the VM network:

```shell
$ # 1. Start the gRPC Server using Homa transport
$ docker run -d --name homa-server --net=host grpc-homa-demo /path/to/compiled/server_binary
$ # 2. Run the gRPC Client to send test RPCs over Homa
$ docker run --rm --net=host grpc-homa-demo /path/to/compiled/client_binary --server=127.0.0.1
```

- _Note: Because Homa requires raw socket mapping and kernel module hooks, passing `--net=host` to
  Docker ensures the containers talk directly through the VM kernel where you loaded `homa.ko`._

[Multipass]: https://canonical.com/multipass
[Lima]: https://lima-vm.io/
[Colima]: https://colima.run/
[UTM]: https://mac.getutm.app/
[OrbStack]: https://orbstack.dev/