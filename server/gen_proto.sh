#!/bin/bash -x
protoc -I../protocol --go_out=. --go_opt=module=github.com/tinaxd/tinaxcraft ../protocol/*.proto
