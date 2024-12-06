from flask import Flask, request, jsonify, make_response
import docker
import sqlite3
import uuid
import os
import logging
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)

# Initialize Docker client
docker_client = docker.from_env()

def make_json_response(data, status_code=200):
    """Helper function to create JSON responses with proper headers"""
    response = make_response(jsonify(data))
    response.headers['Content-Type'] = 'application/json'
    response.status_code = status_code
    return response

@app.route('/api/servers/<server_id>', methods=['GET'])
def get_server(server_id):
    try:
        server = get_server_by_id(server_id)
        if not server:
            return make_json_response({'error': 'Server not found'}, 404)

        # Get container status
        try:
            container = docker_client.containers.get(f"mc_{server_id}")
            server['status'] = container.status
        except docker.errors.NotFound:
            server['status'] = 'stopped'

        return make_json_response(server)
    except Exception as e:
        app.logger.error(f"Error getting server: {str(e)}")
        return make_json_response({'error': str(e)}, 500)

@app.route('/api/servers', methods=['GET'])
def list_servers():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM servers')
        servers = cursor.fetchall()
        cursor.close()
        conn.close()

        server_list = []
        for server in servers:
            server_dict = {
                'id': server[0],
                'name': server[1],
                'version': server[2],
                'port': server[3]
            }
            
            # Get container status
            try:
                container = docker_client.containers.get(f"mc_{server_dict['id']}")
                server_dict['status'] = container.status
            except docker.errors.NotFound:
                server_dict['status'] = 'stopped'
                
            server_list.append(server_dict)

        return make_json_response(server_list)
    except Exception as e:
        app.logger.error(f"Error listing servers: {str(e)}")
        return make_json_response({'error': str(e)}, 500)

@app.route('/api/servers/<server_id>/players', methods=['GET'])
def get_server_players(server_id):
    try:
        server = get_server_by_id(server_id)
        if not server:
            return make_json_response({'error': 'Server not found'}, 404)

        container_name = f"mc_{server_id}"
        try:
            container = docker_client.containers.get(container_name)
            if container.status != 'running':
                return make_json_response([])

            exec_result = container.exec_run(
                'mc-send-to-console list',
                user='minecraft'
            )

            if exec_result.exit_code != 0:
                app.logger.error(f"Error getting player list: {exec_result.output}")
                return make_json_response([])

            output = exec_result.output.decode('utf-8')
            if "players online:" in output:
                players_part = output.split("players online:")[1].strip()
                if players_part:
                    players = [p.strip() for p in players_part.split(",")]
                    return make_json_response(players)

            return make_json_response([])

        except docker.errors.NotFound:
            return make_json_response({'error': 'Server container not found'}, 404)
        except Exception as e:
            app.logger.error(f"Error executing command in container: {str(e)}")
            return make_json_response({'error': str(e)}, 500)

    except Exception as e:
        app.logger.error(f"Error getting server players: {str(e)}")
        return make_json_response({'error': str(e)}, 500)

def create_container(server_id, version, memory='2G', port=None):
    """Create a new Minecraft server container"""
    try:
        container_name = f"mc_{server_id}"
        volume_name = f"mc_data_{server_id}"
        image_name = 'itzg/minecraft-server'

        # Determine the full image name
        full_image_name = f"{image_name}:{version}" if version != 'latest' else image_name

        # Try to get the image first
        try:
            docker_client.images.get(full_image_name)
        except docker.errors.ImageNotFound:
            # Image doesn't exist locally, try to pull it
            try:
                app.logger.info(f"Pulling image {full_image_name}")
                if version == 'latest':
                    docker_client.images.pull(image_name)
                else:
                    docker_client.images.pull(image_name, tag=version)
            except docker.errors.APIError as e:
                app.logger.error(f"Error pulling image: {str(e)}")
                raise Exception(f"Failed to pull Minecraft server image: {str(e)}")

        # Create and start container
        container = docker_client.containers.run(
            full_image_name,
            name=container_name,
            detach=True,
            environment={
                "EULA": "TRUE",
                "MEMORY": memory,
            },
            volumes={
                volume_name: {'bind': '/data', 'mode': 'rw'}
            },
            ports={
                '25565/tcp': port
            },
            restart_policy={"Name": "unless-stopped"}
        )
        return container
    except docker.errors.APIError as e:
        app.logger.error(f"Error creating container: {str(e)}")
        raise Exception(f"Failed to create container: {str(e)}")

@app.route('/api/servers/<server_id>/update', methods=['POST'])
def update_server(server_id):
    try:
        data = request.get_json()
        version = data.get('version')
        memory = data.get('memory', '2G')

        # Get server info from database
        server = get_server_by_id(server_id)
        if not server:
            return jsonify({'error': 'Server not found'}), 404

        # Stop and remove the container if it exists
        container_name = f"mc_{server_id}"
        try:
            container = docker_client.containers.get(container_name)
            container.stop()
            container.remove()
        except docker.errors.NotFound:
            pass  # Container doesn't exist, which is fine

        try:
            # Create new container with updated parameters
            create_container(server_id, version, memory, server['port'])
            
            # Update server info in database
            update_server_version(server_id, version)
            
            return jsonify({'message': 'Server updated successfully'}), 200
        except Exception as e:
            app.logger.error(f"Error updating server: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    except Exception as e:
        app.logger.error(f"Error in update process: {str(e)}")
        return jsonify({'error': str(e)}), 500

def update_server_version(server_id, version):
    """Update server version in the database"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE servers SET version = ? WHERE id = ?',
        (version, server_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

# ... existing code ... 